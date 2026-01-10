-- Fix guest_sessions overly permissive RLS policies
-- This table contains PII (email, phone) and session tokens - must be protected

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Guest sessions viewable by session token" ON public.guest_sessions;
DROP POLICY IF EXISTS "Guest sessions updateable" ON public.guest_sessions;
DROP POLICY IF EXISTS "Anyone can insert guest sessions" ON public.guest_sessions;

-- Create properly scoped policies

-- SELECT: Only allow viewing sessions claimed by the current user, or via service role
CREATE POLICY "Users can view own claimed sessions"
ON public.guest_sessions
FOR SELECT
USING (auth.uid() = claimed_by);

-- INSERT: Allow public inserts but only with specific fields (session creation)
-- This is needed for guest checkout flow
CREATE POLICY "Anyone can create guest sessions"
ON public.guest_sessions
FOR INSERT
WITH CHECK (
  -- New sessions must not be claimed yet
  claimed_by IS NULL AND
  claimed_at IS NULL
);

-- UPDATE: Only allow service role or the user claiming their own session
-- Regular users can only claim unclaimed sessions with their user ID
CREATE POLICY "Users can claim unclaimed sessions"
ON public.guest_sessions
FOR UPDATE
USING (
  -- Session must be unclaimed to be claimed
  claimed_by IS NULL
)
WITH CHECK (
  -- Can only set claimed_by to current user
  claimed_by = auth.uid() AND
  claimed_at IS NOT NULL
);

-- Add server-side validation for orders shipping_address via trigger
-- This provides defense-in-depth for checkout form validation

CREATE OR REPLACE FUNCTION public.validate_order_shipping_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  phone_val text;
  pincode_val text;
  full_name_val text;
  address_line1_val text;
BEGIN
  -- Skip validation if shipping_address is null
  IF NEW.shipping_address IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extract values from JSONB
  phone_val := NEW.shipping_address->>'phone';
  pincode_val := NEW.shipping_address->>'pincode';
  full_name_val := NEW.shipping_address->>'full_name';
  address_line1_val := NEW.shipping_address->>'address_line1';

  -- Validate phone (Indian mobile: 10 digits starting with 6-9)
  IF phone_val IS NOT NULL AND phone_val !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Invalid phone number format. Must be 10 digits starting with 6-9.';
  END IF;

  -- Validate pincode (Indian: 6 digits)
  IF pincode_val IS NOT NULL AND pincode_val !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'Invalid pincode format. Must be 6 digits.';
  END IF;

  -- Validate full_name (2-100 characters, no special dangerous characters)
  IF full_name_val IS NOT NULL THEN
    IF length(full_name_val) < 2 OR length(full_name_val) > 100 THEN
      RAISE EXCEPTION 'Full name must be between 2 and 100 characters.';
    END IF;
    IF full_name_val ~ '[<>"\x00-\x1f]' THEN
      RAISE EXCEPTION 'Full name contains invalid characters.';
    END IF;
  END IF;

  -- Validate address_line1 (5-200 characters, no dangerous characters)
  IF address_line1_val IS NOT NULL THEN
    IF length(address_line1_val) < 5 OR length(address_line1_val) > 200 THEN
      RAISE EXCEPTION 'Address must be between 5 and 200 characters.';
    END IF;
    IF address_line1_val ~ '[<>"\x00-\x1f]' THEN
      RAISE EXCEPTION 'Address contains invalid characters.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for order validation
DROP TRIGGER IF EXISTS validate_order_shipping_address_trigger ON public.orders;
CREATE TRIGGER validate_order_shipping_address_trigger
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.validate_order_shipping_address();