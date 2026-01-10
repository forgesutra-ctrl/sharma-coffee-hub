-- Fix OTP verification RLS policies to be more restrictive
-- The edge functions handle the actual security with rate limiting and validation
-- But we should add basic restrictions to prevent abuse

-- Drop existing policies
DROP POLICY IF EXISTS "OTP verifications are insertable by anyone" ON public.otp_verifications;
DROP POLICY IF EXISTS "OTP verifications are updatable" ON public.otp_verifications;

-- Create more restrictive insert policy
-- Only allow inserts with valid structure (expires_at in future, not verified)
CREATE POLICY "OTP verifications insert with validation" 
ON public.otp_verifications 
FOR INSERT 
WITH CHECK (
  verified = false 
  AND expires_at > now()
  AND length(otp) = 6
  AND phone ~ '^[6-9][0-9]{9}$'
);

-- Create more restrictive update policy
-- Only allow marking as verified, and only for non-expired OTPs
CREATE POLICY "OTP verifications can be marked verified" 
ON public.otp_verifications 
FOR UPDATE 
USING (
  expires_at > now() 
  AND verified = false
)
WITH CHECK (
  verified = true
);

-- Fix has_role function to have explicit search_path (already has it, but ensure it's set)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fix validate_order_shipping_address function to have explicit search_path
CREATE OR REPLACE FUNCTION public.validate_order_shipping_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  addr jsonb;
BEGIN
  -- Skip validation if shipping_address is null
  IF NEW.shipping_address IS NULL THEN
    RETURN NEW;
  END IF;
  
  addr := NEW.shipping_address;
  
  -- Validate phone (Indian mobile: 10 digits starting with 6-9)
  IF addr->>'phone' IS NOT NULL AND NOT (addr->>'phone' ~ '^[6-9][0-9]{9}$') THEN
    RAISE EXCEPTION 'Invalid phone number format. Must be a valid 10-digit Indian mobile number.';
  END IF;
  
  -- Validate pincode (Indian: 6 digits)
  IF addr->>'pincode' IS NOT NULL AND NOT (addr->>'pincode' ~ '^[0-9]{6}$') THEN
    RAISE EXCEPTION 'Invalid pincode format. Must be a valid 6-digit Indian pincode.';
  END IF;
  
  -- Validate full_name (2-100 chars, no script tags)
  IF addr->>'fullName' IS NOT NULL THEN
    IF length(addr->>'fullName') < 2 OR length(addr->>'fullName') > 100 THEN
      RAISE EXCEPTION 'Full name must be between 2 and 100 characters.';
    END IF;
    IF addr->>'fullName' ~ '[<>"''\x00-\x1f]' THEN
      RAISE EXCEPTION 'Full name contains invalid characters.';
    END IF;
  END IF;
  
  -- Validate address_line1 (5-200 chars, no script tags)
  IF addr->>'addressLine1' IS NOT NULL THEN
    IF length(addr->>'addressLine1') < 5 OR length(addr->>'addressLine1') > 200 THEN
      RAISE EXCEPTION 'Address must be between 5 and 200 characters.';
    END IF;
    IF addr->>'addressLine1' ~ '[<>"''\x00-\x1f]' THEN
      RAISE EXCEPTION 'Address contains invalid characters.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function if it exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;