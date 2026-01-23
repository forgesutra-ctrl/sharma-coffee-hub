-- Test Query to Verify Admin Can Access Orders
-- This simulates what the admin dashboard query does

-- 1. Check if there are any orders at all
SELECT 
  'Total Orders' as check_type,
  COUNT(*)::text as result
FROM public.orders

UNION ALL

-- 2. Check recent orders (last 10)
SELECT 
  'Recent Orders (Last 10)' as check_type,
  COUNT(*)::text as result
FROM (
  SELECT id
  FROM public.orders
  ORDER BY created_at DESC
  LIMIT 10
) recent;

-- 3. Show actual recent orders with details
SELECT 
  id,
  order_number,
  user_id,
  status,
  payment_status,
  payment_type,
  total_amount,
  created_at,
  CASE 
    WHEN order_number LIKE 'SUB-%' THEN 'Subscription'
    ELSE 'One-time'
  END as order_type
FROM public.orders
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if RLS is blocking access (this will show what an admin user can see)
-- Note: This query runs with the current user's permissions
-- If you're running as service role, you'll see all orders
-- If running as admin user, RLS policies will apply

SELECT 
  'Orders visible to current user' as check_type,
  COUNT(*)::text as result
FROM public.orders;

-- 5. Verify RLS policies are active
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as has_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as has_with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;
