-- Contact form enquiries from /contact.
-- Until now the form discarded every submission and still told the visitor "Message sent".
--
-- Access model:
--   anon / authenticated visitors  INSERT only, and only name, email, subject, message.
--                                  No SELECT, no UPDATE: customer names and emails are
--                                  never readable from the public API.
--   admin / super_admin            SELECT, and UPDATE of status (to mark enquiries handled).
-- The inserting client must not ask for the row back (no .select() after .insert()),
-- because anon has no SELECT; supabase-js inserts with return=minimal by default.

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (char_length(email) <= 320 AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 1 AND 300),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 5000),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'handled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contact_messages_created_at_idx ON public.contact_messages (created_at DESC);

CREATE TRIGGER update_contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Privileges first, so RLS is not the only line of defence. Supabase grants ALL on new
-- public tables to anon and authenticated by default; take that back.
REVOKE ALL ON public.contact_messages FROM anon, authenticated;
GRANT INSERT (name, email, subject, message) ON public.contact_messages TO anon, authenticated;
GRANT SELECT ON public.contact_messages TO authenticated;
GRANT UPDATE (status) ON public.contact_messages TO authenticated;

CREATE POLICY "Anyone can submit a contact message"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'new');

CREATE POLICY "Admins can read contact messages"
  ON public.contact_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );
