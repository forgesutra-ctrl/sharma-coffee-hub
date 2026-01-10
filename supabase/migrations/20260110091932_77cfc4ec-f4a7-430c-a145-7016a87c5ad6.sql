-- Fix 1: Remove public read access from otp_verifications table
-- OTP verification should only happen server-side via Edge Functions with service role
DROP POLICY IF EXISTS "OTP verifications are selectable" ON otp_verifications;

-- Create restrictive SELECT policy - only service role should read OTPs (handled by Edge Functions)
CREATE POLICY "No public OTP reads" 
ON otp_verifications 
FOR SELECT 
USING (false);

-- Fix 2: Fix order_items INSERT policy to require order ownership
DROP POLICY IF EXISTS "Users can insert order items" ON order_items;

-- Create proper INSERT policy that validates order ownership
CREATE POLICY "Users can insert own order items" 
ON order_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR orders.guest_session_id IS NOT NULL)
  )
);

-- Fix 3: Add input validation to has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Input validation: return false for null user_id
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;