-- COMPLETE FIX FOR SUPER ADMIN ACCESS
-- Run this entire script in Supabase SQL Editor

-- Step 1: Check if super_admin exists in the enum
SELECT unnest(enum_range(NULL::app_role)) AS role_value;

-- Step 2: If super_admin doesn't exist, add it to the enum
-- (Only run this if super_admin is missing from Step 1)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'super_admin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE app_role ADD VALUE 'super_admin';
    ALTER TYPE app_role ADD VALUE 'staff';
    ALTER TYPE app_role ADD VALUE 'shop_staff';
    ALTER TYPE app_role ADD VALUE 'customer';
  END IF;
END $$;

-- Step 3: Check current user and role
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  ur.created_at as role_created_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ask@sharmacoffeeworks.com';

-- Step 4: Delete any existing role entries (in case of duplicates)
DELETE FROM user_roles 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ask@sharmacoffeeworks.com'
);

-- Step 5: Insert super_admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'ask@sharmacoffeeworks.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'super_admin'::app_role;

-- Step 6: Verify the fix
SELECT 
  u.email,
  ur.role,
  ur.created_at as role_assigned_at,
  CASE 
    WHEN ur.role = 'super_admin' THEN '✅ Super Admin Access Granted'
    ELSE '❌ Wrong Role: ' || ur.role
  END as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'ask@sharmacoffeeworks.com';
