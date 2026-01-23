-- Verify RLS Policy Logic
-- This helps understand why policies might not be working in frontend

-- 1. Check what roles exist in the system
SELECT DISTINCT role::text as role_name, COUNT(*) as user_count
FROM public.user_roles
GROUP BY role
ORDER BY role;

-- 2. Verify the exact role values that should match
-- The policies check for these exact strings
SELECT 
  'Policy Check Values' as info,
  'super_admin' as super_admin_value,
  'staff' as staff_value,
  'admin' as admin_value;

-- 3. Check if any users have roles that match the policy conditions
SELECT 
  u.id as user_id,
  u.email,
  ur.role::text as role_text,
  ur.role as role_enum,
  CASE 
    WHEN ur.role::text = 'super_admin' THEN '✅ Matches super_admin policy'
    WHEN ur.role::text IN ('staff', 'admin', 'super_admin') THEN '✅ Matches staff policy'
    ELSE '❌ Does not match any admin policy'
  END as policy_match
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN ('ask@sharmacoffeeworks.com', 'sharmacoffeeoffice@gmail.com');

-- 4. Test the exact policy condition logic
-- This simulates what happens when auth.uid() is called
-- Replace 'aea82e0f-3c31-4bcb-9356-4aaca9f4930b' with super_admin user_id
SELECT 
  'Policy Logic Test' as test_name,
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = 'aea82e0f-3c31-4bcb-9356-4aaca9f4930b'
    AND user_roles.role::text = 'super_admin'
  ) as super_admin_policy_would_match,
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = 'aea82e0f-3c31-4bcb-9356-4aaca9f4930b'
    AND user_roles.role::text IN ('staff', 'admin', 'super_admin')
  ) as staff_policy_would_match;
