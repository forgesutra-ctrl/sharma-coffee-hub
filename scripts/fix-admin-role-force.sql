-- FORCE FIX SUPER ADMIN ROLE - BYPASSES RLS
-- Run this in Supabase SQL Editor
-- This uses SECURITY DEFINER to ensure the update works

-- Step 1: Create a function to force update the role (bypasses RLS)
CREATE OR REPLACE FUNCTION force_update_admin_role(
  p_email TEXT,
  p_role TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result TEXT;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RETURN 'ERROR: User not found with email ' || p_email;
  END IF;
  
  -- Delete any existing roles
  DELETE FROM user_roles WHERE user_id = v_user_id;
  
  -- Insert new role
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, p_role::app_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET role = p_role::app_role;
  
  -- Verify
  SELECT role::TEXT INTO v_result
  FROM user_roles
  WHERE user_id = v_user_id;
  
  RETURN 'SUCCESS: Role updated to ' || v_result || ' for user ' || p_email;
END;
$$;

-- Step 2: Run the function to fix the admin role
SELECT force_update_admin_role('ask@sharmacoffeeworks.com', 'super_admin');

-- Step 3: Verify the result
SELECT 
  u.email,
  ur.role,
  ur.created_at,
  CASE 
    WHEN ur.role = 'super_admin' THEN '✅ FIXED - Super Admin Access Granted'
    WHEN ur.role = 'customer' THEN '❌ STILL CUSTOMER - Update failed'
    ELSE '⚠️ Role: ' || ur.role
  END as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ask@sharmacoffeeworks.com';

-- Step 4: Clean up the function (optional)
-- DROP FUNCTION IF EXISTS force_update_admin_role(TEXT, TEXT);
