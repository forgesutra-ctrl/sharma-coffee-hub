-- FORCE FIX STAFF ROLE - BYPASSES RLS
-- Run this in Supabase SQL Editor if the direct update doesn't work
-- This uses SECURITY DEFINER to ensure the update works

-- Step 1: Create a function to force update the role (bypasses RLS)
CREATE OR REPLACE FUNCTION force_update_staff_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := '50260752-899f-443f-ac80-b77f35b75c2a';
  v_result TEXT;
BEGIN
  -- Delete any existing roles
  DELETE FROM user_roles WHERE user_id = v_user_id;
  
  -- Insert new role
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'staff'::app_role);
  
  -- Verify
  SELECT role::TEXT INTO v_result
  FROM user_roles
  WHERE user_id = v_user_id;
  
  RETURN 'SUCCESS: Role updated to ' || v_result || ' for staff account';
END;
$$;

-- Step 2: Run the function to fix the staff role
SELECT force_update_staff_role();

-- Step 3: Verify the result
SELECT 
  u.email,
  ur.role,
  ur.created_at,
  CASE 
    WHEN ur.role = 'staff' THEN '✅ FIXED - Staff Access Granted'
    WHEN ur.role = 'customer' THEN '❌ STILL CUSTOMER - Update failed'
    ELSE '⚠️ Role: ' || ur.role
  END as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'sharmacoffeeoffice@gmail.com';

-- Step 4: Clean up the function (optional)
-- DROP FUNCTION IF EXISTS force_update_staff_role();
