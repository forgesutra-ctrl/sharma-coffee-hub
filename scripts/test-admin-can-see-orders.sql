-- Test if admin can see orders
-- Run this while logged in as admin to verify RLS policies work

-- 1. Check current user and role
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email;

-- 2. Check if current user has admin role
SELECT 
  ur.role,
  ur.user_id,
  u.email
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.user_id = auth.uid();

-- 3. Count orders visible to current user (respects RLS)
SELECT 
  'Orders visible to current user' as check_type,
  COUNT(*) as order_count
FROM public.orders;

-- 4. Show recent orders visible to current user (respects RLS)
SELECT 
  id,
  order_number,
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

-- 5. If you see 0 orders but know orders exist, check:
--    a) Are you logged in as the correct admin user?
--    b) Does the admin user have the correct role?
--    c) Are there actually orders in the database?
