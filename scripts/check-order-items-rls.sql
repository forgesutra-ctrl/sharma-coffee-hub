-- Check Order Items RLS Policies and Data
-- This helps diagnose why order items might not be visible

-- 1. Check RLS policies for order_items table
SELECT 
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Has USING clause'
    ELSE '❌ Missing USING clause'
  END as status
FROM pg_policies
WHERE tablename = 'order_items'
ORDER BY policyname;

-- 2. Check if order_items exist for recent orders
SELECT 
  o.id as order_id,
  o.order_number,
  o.created_at as order_date,
  COUNT(oi.id) as item_count
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id = oi.order_id
WHERE o.created_at > NOW() - INTERVAL '7 days'
GROUP BY o.id, o.order_number, o.created_at
ORDER BY o.created_at DESC
LIMIT 10;

-- 3. Show sample order items for a specific order
-- Replace 'c9850e97-0b19-40a7-9a47-7239bc242677' with an actual order_id
SELECT 
  oi.*,
  o.order_number
FROM public.order_items oi
JOIN public.orders o ON oi.order_id = o.id
WHERE o.order_number = 'ORD-20260123-5422'
ORDER BY oi.created_at;

-- 4. Check total order items in database
SELECT 
  'Total Order Items' as check_type,
  COUNT(*) as item_count
FROM public.order_items;

-- 5. Check if there are orders without items
SELECT 
  'Orders without items' as check_type,
  COUNT(*) as order_count
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id = oi.order_id
WHERE oi.id IS NULL;
