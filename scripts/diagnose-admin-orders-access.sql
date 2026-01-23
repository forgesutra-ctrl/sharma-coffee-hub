-- Diagnostic Script for Admin Orders Access
-- Run this to check if admin can access orders

-- 1. Check admin user roles
SELECT 
  u.id as user_id,
  u.email,
  ur.role,
  ur.created_at as role_created_at,
  CASE 
    WHEN ur.role IN ('super_admin', 'admin', 'staff') THEN '✅ Has Admin Access'
    WHEN ur.role IS NULL THEN '❌ No Role Assigned'
    ELSE '❌ Wrong Role: ' || ur.role
  END as access_status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN (
  'ask@sharmacoffeeworks.com',
  'sharmacoffeeoffice@gmail.com'
)
ORDER BY u.email;

-- 2. Check total orders in database
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN order_number LIKE 'SUB-%' THEN 1 END) as subscription_orders,
  COUNT(CASE WHEN order_number NOT LIKE 'SUB-%' OR order_number IS NULL THEN 1 END) as one_time_orders,
  MIN(created_at) as oldest_order,
  MAX(created_at) as newest_order
FROM public.orders;

-- 3. Check recent orders (last 10)
SELECT 
  id,
  order_number,
  user_id,
  status,
  payment_status,
  total_amount,
  created_at,
  CASE 
    WHEN order_number LIKE 'SUB-%' THEN 'Subscription'
    ELSE 'One-time'
  END as order_type
FROM public.orders
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check RLS policies on orders table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 5. Test if orders are accessible (replace USER_ID with actual admin user ID)
-- This simulates what the admin query would return
-- Replace 'YOUR_ADMIN_USER_ID' with the actual user_id from step 1
/*
SELECT 
  COUNT(*) as accessible_orders_count
FROM public.orders
WHERE (
  -- User can view own orders
  user_id = 'YOUR_ADMIN_USER_ID'
  OR
  -- Super admin can view all orders
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = 'YOUR_ADMIN_USER_ID'
    AND role = 'super_admin'
  )
  OR
  -- Staff can view all orders
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = 'YOUR_ADMIN_USER_ID'
    AND role IN ('staff', 'admin', 'super_admin')
  )
);
*/
