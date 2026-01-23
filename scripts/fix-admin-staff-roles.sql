-- Fix Admin and Staff Login Issues
-- This script ensures admin and staff users have the correct roles assigned

-- Check current admin/staff users and their roles
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  ur.created_at as role_created_at,
  CASE 
    WHEN ur.role IS NULL THEN '❌ No Role Assigned'
    WHEN ur.role NOT IN ('super_admin', 'admin', 'staff') THEN '❌ Wrong Role: ' || ur.role
    ELSE '✅ Correct Role'
  END as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN (
  'ask@sharmacoffeeworks.com',
  'sharmacoffeeoffice@gmail.com'
)
ORDER BY u.email;

-- Fix super_admin role for ask@sharmacoffeeworks.com
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'ask@sharmacoffeeworks.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Upsert the role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'super_admin'::app_role)
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'super_admin'::app_role;
    
    RAISE NOTICE '✅ Fixed super_admin role for ask@sharmacoffeeworks.com';
  ELSE
    RAISE NOTICE '❌ User ask@sharmacoffeeworks.com not found';
  END IF;
END $$;

-- Fix staff role for sharmacoffeeoffice@gmail.com
DO $$
DECLARE
  staff_user_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO staff_user_id
  FROM auth.users
  WHERE email = 'sharmacoffeeoffice@gmail.com';
  
  IF staff_user_id IS NOT NULL THEN
    -- Upsert the role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (staff_user_id, 'staff'::app_role)
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'staff'::app_role;
    
    RAISE NOTICE '✅ Fixed staff role for sharmacoffeeoffice@gmail.com';
  ELSE
    RAISE NOTICE '❌ User sharmacoffeeoffice@gmail.com not found';
  END IF;
END $$;

-- Verify the fixes
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  ur.created_at as role_created_at,
  CASE 
    WHEN ur.role IS NULL THEN '❌ No Role Assigned'
    WHEN ur.role NOT IN ('super_admin', 'admin', 'staff') THEN '❌ Wrong Role: ' || ur.role
    ELSE '✅ Correct Role'
  END as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN (
  'ask@sharmacoffeeworks.com',
  'sharmacoffeeoffice@gmail.com'
)
ORDER BY u.email;
