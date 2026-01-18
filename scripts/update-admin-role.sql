-- Fix admin role for ask@sharmacoffeeworks.com
-- This script updates the user role from 'customer' to 'super_admin'

-- Step 1: Find the user ID
-- Run this first to get the user ID:
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'ask@sharmacoffeeworks.com';

-- Step 2: Update the role to super_admin
-- Replace 'USER_ID_HERE' with the actual user ID from Step 1
-- Or use this version that finds the user automatically:

UPDATE user_roles
SET role = 'super_admin'
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'ask@sharmacoffeeworks.com'
);

-- Step 3: Verify the update
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_assigned_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ask@sharmacoffeeworks.com';

-- If the user doesn't have a role entry yet, use INSERT instead:
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'ask@sharmacoffeeworks.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'super_admin';
