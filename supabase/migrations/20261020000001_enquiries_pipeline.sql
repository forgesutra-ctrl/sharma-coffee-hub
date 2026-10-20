-- Enquiries pipeline, part 2: honeypot, optional phone, Telegram alert, and privilege hygiene
-- on wholesale_inquiries.
--
-- Prerequisite: the pg_net extension (already used by the process-webhook-queue cron job).
-- The edge function notify-contact-message must be deployed with JWT verification off
-- (supabase/config.toml) for alerts to arrive. Until it is, the trigger's HTTP call fails in
-- the background and the insert is unaffected.

-- ===========================================================================================
-- 1. contact_messages: optional phone, honeypot column, alert bookkeeping
-- ===========================================================================================

ALTER TABLE public.contact_messages
  -- Optional. Digits with an optional leading +, spaces, dashes or brackets; 7 to 20 chars.
  ADD COLUMN phone text CHECK (
    phone IS NULL OR (char_length(phone) BETWEEN 7 AND 20 AND phone ~ '^\+?[0-9][0-9 ()-]*[0-9]$')
  ),
  -- Honeypot. The form's hidden "website" field maps to this name. It is never granted to
  -- anon or authenticated, so any API insert that includes it fails with permission denied,
  -- and the CHECK keeps it NULL even for privileged writers.
  ADD COLUMN website text CHECK (website IS NULL),
  -- Set by the notify function once the Telegram alert has been sent; makes the alert
  -- one-shot, so replaying a request cannot re-send it. Not granted to anon/authenticated.
  ADD COLUMN alerted_at timestamptz;

-- Visitors may now also supply phone. website and alerted_at are deliberately not granted.
GRANT INSERT (phone) ON public.contact_messages TO anon, authenticated;

-- ===========================================================================================
-- 2. Telegram alert on insert
-- ===========================================================================================
-- pg_net only queues the request; the HTTP call happens after the insert has committed, in
-- a background worker. A failed or slow Telegram/edge call therefore cannot fail the insert.
-- Anything that could fail synchronously (pg_net unavailable) is caught below and downgraded
-- to a WARNING, so the row always lands.
--
-- No credentials here: the URL is the project's public functions endpoint, and the function
-- runs without JWT verification, like send-order-notification and send-otp. It is safe to
-- call unauthenticated because it accepts only a row id (never exposed to visitors), reads
-- the row itself with the service role, and alerts at most once per row, within 10 minutes
-- of the insert. Only the id is sent, so the message body never enters pg_net's logs.

CREATE OR REPLACE FUNCTION public.notify_contact_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://cfuwclyvoemrutrcgxeq.supabase.co/functions/v1/notify-contact-message',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('id', NEW.id),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_contact_message: alert not queued for % (%)', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_contact_message() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER contact_messages_notify
  AFTER INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_contact_message();

-- ===========================================================================================
-- 3. wholesale_inquiries: privilege hygiene only. Policies are NOT changed.
-- ===========================================================================================
-- RLS is enabled and the existing policies work: a known-good anonymous insert succeeded on
-- 2026-10-20. Production's INSERT policy also validates field content, which is why a
-- partial payload was rejected; it is kept exactly as it is.
-- The table-level grants, though, are Supabase's defaults (ALL to anon and authenticated),
-- held back only by policy. Narrow them, as for contact_messages, as defence in depth:
--   anon            INSERT of the form's columns only
--   authenticated   the same INSERT, SELECT, and UPDATE of status (policies still gate
--                   SELECT/UPDATE to admin and super_admin)
--   nobody          DELETE. This makes the existing "Admins can delete wholesale inquiries"
--                   policy inert; no admin screen uses it, and the SQL editor still can.

REVOKE ALL ON public.wholesale_inquiries FROM anon, authenticated;
GRANT INSERT (
  business_name, contact_person, email, phone, business_type,
  products_interested, estimated_volume, delivery_location, message
) ON public.wholesale_inquiries TO anon, authenticated;
GRANT SELECT ON public.wholesale_inquiries TO authenticated;
GRANT UPDATE (status) ON public.wholesale_inquiries TO authenticated;
