-- FIX STAFF ROLE FOR sharmacoffeeoffice@gmail.com
-- Run this in Supabase SQL Editor
-- This ensures the staff account has the correct 'staff' role

-- Step 1: Check current user and role
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  ur.created_at as role_created_at,
  CASE 
    WHEN ur.role = 'staff' THEN '✅ Correct Role'
    WHEN ur.role IS NULL THEN '❌ No Role Assigned'
    ELSE '❌ Wrong Role: ' || ur.role
  END as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'sharmacoffeeoffice@gmail.com';

-- Step 2: Update the role directly (using the known user_id for faster execution)
UPDATE user_roles
SET role = 'staff'::app_role
WHERE user_id = '50260752-899f-443f-ac80-b77f35b75c2a';

-- Alternative: If the above doesn't work, delete and recreate
-- DELETE FROM user_roles WHERE user_id = '50260752-899f-443f-ac80-b77f35b75c2a';
-- INSERT INTO user_roles (user_id, role) VALUES ('50260752-899f-443f-ac80-b77f35b75c2a', 'staff'::app_role);

-- Step 3: If UPDATE didn't work, use INSERT with ON CONFLICT
INSERT INTO user_roles (user_id, role)
VALUES ('50260752-899f-443f-ac80-b77f35b75c2a', 'staff'::app_role)
ON CONFLICT (user_id) 
DO UPDATE SET role = 'staff'::app_role;

-- Step 4: Verify the fix
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_assigned_at,
  CASE 
    WHEN ur.role = 'staff' THEN '✅ Staff Access Granted'
    WHEN ur.role = 'customer' THEN '❌ STILL CUSTOMER - Update failed'
    WHEN ur.role IS NULL THEN '❌ No Role - User may not exist'
    ELSE '⚠️ Unexpected Role: ' || ur.role
  END as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'sharmacoffeeoffice@gmail.com';
