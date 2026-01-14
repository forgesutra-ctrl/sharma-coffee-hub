/*
  # Seed Admin Accounts
  
  1. Super Admin Account
    - Email: ask@sharmacoffeeworks.com
    - Password: ScW@1987
    - Role: super_admin
    - Full access to entire admin panel
  
  2. Staff Account
    - Email: sharmacoffeeoffice@gmail.com
    - Password: SCO@1987
    - Role: staff
    - Access only to Operations and Shipping
  
  3. Notes
    - Accounts will be created via Supabase Auth
    - Passwords are set during account creation
    - This migration creates the accounts if they don't exist
*/

-- Note: Admin accounts will be created via the create-admin-user edge function
-- This migration ensures the proper structure is in place

-- Create a function to check and create admin accounts
CREATE OR REPLACE FUNCTION public.ensure_admin_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  super_admin_id uuid;
  staff_id uuid;
BEGIN
  -- Check if super admin exists
  SELECT id INTO super_admin_id 
  FROM auth.users 
  WHERE email = 'ask@sharmacoffeeworks.com' 
  LIMIT 1;
  
  IF super_admin_id IS NOT NULL THEN
    -- Ensure super_admin role is assigned
    INSERT INTO public.user_roles (user_id, role)
    VALUES (super_admin_id, 'super_admin'::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin'::app_role;
  END IF;
  
  -- Check if staff exists
  SELECT id INTO staff_id 
  FROM auth.users 
  WHERE email = 'sharmacoffeeoffice@gmail.com' 
  LIMIT 1;
  
  IF staff_id IS NOT NULL THEN
    -- Ensure staff role is assigned
    INSERT INTO public.user_roles (user_id, role)
    VALUES (staff_id, 'staff'::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = 'staff'::app_role;
  END IF;
END;
$$;

-- Run the function to ensure accounts are set up correctly
SELECT public.ensure_admin_accounts();
