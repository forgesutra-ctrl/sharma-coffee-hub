-- ============================================================================
-- DIAGNOSTIC SCRIPT: Find Missing Orders
-- ============================================================================
-- This script helps identify orders that might not be visible in the admin dashboard
-- Run this in Supabase SQL Editor to check for:
-- 1. Orders without user_id
-- 2. Orders with payment_status issues
-- 3. Orders that might be blocked by RLS policies
-- ============================================================================

-- Check total orders count
SELECT 
  'Total Orders' as check_type,
  COUNT(*) as count
FROM orders;

-- Check orders by payment status
SELECT 
  'Orders by Payment Status' as check_type,
  payment_status,
  COUNT(*) as count
FROM orders
GROUP BY payment_status
ORDER BY count DESC;

-- Check orders by order status
SELECT 
  'Orders by Order Status' as check_type,
  status,
  COUNT(*) as count
FROM orders
GROUP BY status
ORDER BY count DESC;

-- Check orders without user_id (guest orders)
SELECT 
  'Orders without user_id (Guest Orders)' as check_type,
  COUNT(*) as count
FROM orders
WHERE user_id IS NULL;

-- Check orders with user_id
SELECT 
  'Orders with user_id' as check_type,
  COUNT(*) as count
FROM orders
WHERE user_id IS NOT NULL;

-- Check recent orders (last 7 days)
SELECT 
  'Recent Orders (Last 7 Days)' as check_type,
  COUNT(*) as count
FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Check orders with payment but no order_number
SELECT 
  'Orders without order_number' as check_type,
  id,
  created_at,
  total_amount,
  payment_status,
  razorpay_payment_id
FROM orders
WHERE order_number IS NULL OR order_number = ''
ORDER BY created_at DESC
LIMIT 20;

-- Check orders with razorpay_payment_id but not visible
SELECT 
  'Orders with Razorpay Payment ID' as check_type,
  COUNT(*) as count
FROM orders
WHERE razorpay_payment_id IS NOT NULL;

-- Check orders created in last 24 hours
SELECT 
  'Orders Created in Last 24 Hours' as check_type,
  id,
  order_number,
  user_id,
  total_amount,
  payment_status,
  status,
  created_at
FROM orders
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check for orders with missing order_items
SELECT 
  'Orders without order_items' as check_type,
  o.id,
  o.order_number,
  o.created_at,
  o.total_amount,
  COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.order_number, o.created_at, o.total_amount
HAVING COUNT(oi.id) = 0
ORDER BY o.created_at DESC
LIMIT 20;

-- Check orders that might be blocked by RLS (orders with user_id but user doesn't exist)
SELECT 
  'Orders with Invalid user_id' as check_type,
  o.id,
  o.order_number,
  o.user_id,
  o.created_at,
  o.total_amount
FROM orders o
LEFT JOIN auth.users u ON o.user_id = u.id
WHERE o.user_id IS NOT NULL AND u.id IS NULL
ORDER BY o.created_at DESC
LIMIT 20;

-- Summary: Orders that should be visible to admins
SELECT 
  'Summary: All Orders (Should be visible to admins)' as check_type,
  COUNT(*) as total_orders,
  COUNT(DISTINCT user_id) as unique_customers,
  SUM(total_amount) as total_revenue,
  MIN(created_at) as oldest_order,
  MAX(created_at) as newest_order
FROM orders;
