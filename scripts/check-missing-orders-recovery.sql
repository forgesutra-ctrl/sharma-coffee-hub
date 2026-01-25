-- ============================================================================
-- CHECK FOR MISSING ORDERS - Recovery Script
-- ============================================================================
-- This script helps identify payments that were captured but orders weren't created
-- Run this periodically to catch missing orders
-- ============================================================================

-- Check orders created in last 7 days
SELECT 
  'Orders Created (Last 7 Days)' as check_type,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue
FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Check for orders with empty order_number (should not exist)
SELECT 
  'Orders with Empty order_number' as check_type,
  id,
  razorpay_payment_id,
  total_amount,
  created_at
FROM orders
WHERE order_number IS NULL OR order_number = ''
ORDER BY created_at DESC
LIMIT 20;

-- Check for orders without order_items
SELECT 
  'Orders without Items (Last 7 Days)' as check_type,
  o.id,
  o.order_number,
  o.razorpay_payment_id,
  o.total_amount,
  o.created_at,
  COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY o.id, o.order_number, o.razorpay_payment_id, o.total_amount, o.created_at
HAVING COUNT(oi.id) = 0
ORDER BY o.created_at DESC;

-- Check for orders with invalid phone numbers in shipping_address
SELECT 
  'Orders with Invalid Phone Format' as check_type,
  id,
  order_number,
  razorpay_payment_id,
  shipping_address->>'phone' as phone,
  created_at
FROM orders
WHERE shipping_address->>'phone' IS NOT NULL
  AND shipping_address->>'phone' !~ '^[6-9][0-9]{9}$'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- Summary of potential issues
SELECT 
  'Summary of Issues' as check_type,
  COUNT(*) FILTER (WHERE order_number IS NULL OR order_number = '') as orders_without_number,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM order_items WHERE order_items.order_id = orders.id
  )) as orders_without_items,
  COUNT(*) FILTER (WHERE shipping_address->>'phone' IS NOT NULL 
    AND shipping_address->>'phone' !~ '^[6-9][0-9]{9}$') as orders_with_invalid_phone
FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days';
