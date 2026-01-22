-- DIRECT FIX FOR STAFF ROLE
-- Run this in Supabase SQL Editor
-- This directly updates the role for the known user_id

-- Method 1: Direct UPDATE (fastest)
UPDATE user_roles
SET role = 'staff'::app_role
WHERE user_id = '50260752-899f-443f-ac80-b77f35b75c2a';

-- Method 2: If UPDATE doesn't work due to RLS, use INSERT with ON CONFLICT
INSERT INTO user_roles (user_id, role)
VALUES ('50260752-899f-443f-ac80-b77f35b75c2a', 'staff'::app_role)
ON CONFLICT (user_id) 
DO UPDATE SET role = 'staff'::app_role;

-- Verify the fix
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_assigned_at,
  CASE 
    WHEN ur.role = 'staff' THEN '✅ Staff Access Granted - Login should work now!'
    WHEN ur.role = 'customer' THEN '❌ STILL CUSTOMER - RLS may be blocking update'
    WHEN ur.role IS NULL THEN '❌ No Role - User may not exist'
    ELSE '⚠️ Unexpected Role: ' || ur.role
  END as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'sharmacoffeeoffice@gmail.com';
