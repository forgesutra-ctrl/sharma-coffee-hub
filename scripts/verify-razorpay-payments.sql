-- ============================================================================
-- VERIFY RAZORPAY PAYMENTS - Check if payments are captured as orders
-- ============================================================================
-- This script verifies if the provided Razorpay payment IDs have corresponding
-- orders in the database. Run this after checking Razorpay dashboard.
-- ============================================================================

-- List of payment IDs to verify (from Razorpay dashboard)
-- Captured payments (should have orders):
-- pay_S82FKkPoEM5yEk - ₹2,000 - Jan 25, 1:20pm (MISSING)
-- pay_S7yVokl4FmKHCw - ₹750 - Jan 25, 9:41am
-- pay_S7lzh49gPLcMMt - ₹230 - Jan 24, 9:27pm (MISSING)
-- pay_S7ZwMsB6thhMqq - ₹910 - Jan 24, 9:39am
-- pay_S7MTymf7bD0uYy - ₹950 - Jan 23, 8:29pm
-- pay_S7CcXgjw7B2sjW - ₹940 - Jan 23, 10:50am
-- pay_S79HNY2ky0Qou9 - ₹840 - Jan 23, 7:34am
-- 
-- Failed payments (should NOT have orders):
-- pay_S7lsCnFdtyWn5r - ₹230 - Failed - Jan 24, 9:20pm
-- pay_S7c02ct3bM3mnK - ₹270 - Failed - Jan 24, 11:40am

-- ============================================================================
-- VERIFICATION QUERY: Check all payment IDs
-- ============================================================================

WITH payment_list AS (
  SELECT 
    'pay_S82FKkPoEM5yEk' as payment_id, 2000.00 as expected_amount, 'Captured' as razorpay_status, '2026-01-25 13:20:00'::timestamp as payment_date
  UNION ALL SELECT 'pay_S7yVokl4FmKHCw', 750.00, 'Captured', '2026-01-25 09:41:00'::timestamp
  UNION ALL SELECT 'pay_S7lzh49gPLcMMt', 230.00, 'Captured', '2026-01-24 21:27:00'::timestamp
  UNION ALL SELECT 'pay_S7lsCnFdtyWn5r', 230.00, 'Failed', '2026-01-24 21:20:00'::timestamp
  UNION ALL SELECT 'pay_S7c02ct3bM3mnK', 270.00, 'Failed', '2026-01-24 11:40:00'::timestamp
  UNION ALL SELECT 'pay_S7ZwMsB6thhMqq', 910.00, 'Captured', '2026-01-24 09:39:00'::timestamp
  UNION ALL SELECT 'pay_S7MTymf7bD0uYy', 950.00, 'Captured', '2026-01-23 20:29:00'::timestamp
  UNION ALL SELECT 'pay_S7CcXgjw7B2sjW', 940.00, 'Captured', '2026-01-23 10:50:00'::timestamp
  UNION ALL SELECT 'pay_S79HNY2ky0Qou9', 840.00, 'Captured', '2026-01-23 07:34:00'::timestamp
)
SELECT 
  pl.payment_id,
  pl.razorpay_status,
  pl.expected_amount,
  pl.payment_date,
  CASE 
    WHEN o.id IS NOT NULL THEN '✅ ORDER EXISTS'
    WHEN pl.razorpay_status = 'Failed' THEN '⚠️ NO ORDER (Expected - Payment Failed)'
    ELSE '❌ MISSING ORDER'
  END as verification_status,
  o.id as order_id,
  o.order_number,
  o.total_amount as order_amount,
  o.payment_status as order_payment_status,
  o.status as order_status,
  o.created_at as order_created_at,
  o.user_id,
  (o.shipping_address->>'email')::text as customer_email,
  (o.shipping_address->>'phone')::text as customer_phone,
  (o.shipping_address->>'full_name')::text as customer_name,
  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as order_items_count
FROM payment_list pl
LEFT JOIN orders o ON o.razorpay_payment_id = pl.payment_id
ORDER BY pl.payment_date DESC;

-- ============================================================================
-- SUMMARY: Captured vs Missing Orders
-- ============================================================================

SELECT 
  'SUMMARY' as report_type,
  COUNT(*) FILTER (WHERE razorpay_status = 'Captured' AND o.id IS NOT NULL) as captured_with_orders,
  COUNT(*) FILTER (WHERE razorpay_status = 'Captured' AND o.id IS NULL) as captured_missing_orders,
  COUNT(*) FILTER (WHERE razorpay_status = 'Failed' AND o.id IS NULL) as failed_no_orders_expected,
  COUNT(*) FILTER (WHERE razorpay_status = 'Failed' AND o.id IS NOT NULL) as failed_has_order_unexpected
FROM (
  SELECT 
    'pay_S82FKkPoEM5yEk' as payment_id, 'Captured' as razorpay_status
  UNION ALL SELECT 'pay_S7yVokl4FmKHCw', 'Captured'
  UNION ALL SELECT 'pay_S7lzh49gPLcMMt', 'Captured'
  UNION ALL SELECT 'pay_S7lsCnFdtyWn5r', 'Failed'
  UNION ALL SELECT 'pay_S7c02ct3bM3mnK', 'Failed'
  UNION ALL SELECT 'pay_S7ZwMsB6thhMqq', 'Captured'
  UNION ALL SELECT 'pay_S7MTymf7bD0uYy', 'Captured'
  UNION ALL SELECT 'pay_S7CcXgjw7B2sjW', 'Captured'
  UNION ALL SELECT 'pay_S79HNY2ky0Qou9', 'Captured'
) pl
LEFT JOIN orders o ON o.razorpay_payment_id = pl.payment_id;

-- ============================================================================
-- DETAILED CHECK: Amount Matching
-- ============================================================================

SELECT 
  'AMOUNT VERIFICATION' as check_type,
  pl.payment_id,
  pl.expected_amount as razorpay_amount,
  o.total_amount as order_amount,
  CASE 
    WHEN o.total_amount IS NULL THEN 'NO ORDER'
    WHEN ABS(o.total_amount - pl.expected_amount) < 0.01 THEN '✅ AMOUNT MATCHES'
    ELSE '⚠️ AMOUNT MISMATCH'
  END as amount_status,
  ABS(COALESCE(o.total_amount, 0) - pl.expected_amount) as amount_difference
FROM (
  SELECT 'pay_S82FKkPoEM5yEk' as payment_id, 2000.00 as expected_amount
  UNION ALL SELECT 'pay_S7yVokl4FmKHCw', 750.00
  UNION ALL SELECT 'pay_S7lzh49gPLcMMt', 230.00
  UNION ALL SELECT 'pay_S7ZwMsB6thhMqq', 910.00
  UNION ALL SELECT 'pay_S7MTymf7bD0uYy', 950.00
  UNION ALL SELECT 'pay_S7CcXgjw7B2sjW', 940.00
  UNION ALL SELECT 'pay_S79HNY2ky0Qou9', 840.00
) pl
LEFT JOIN orders o ON o.razorpay_payment_id = pl.payment_id
WHERE pl.expected_amount > 0
ORDER BY pl.expected_amount DESC;

-- ============================================================================
-- CHECK FOR DUPLICATE ORDERS (same payment ID, multiple orders)
-- ============================================================================

SELECT 
  'DUPLICATE CHECK' as check_type,
  razorpay_payment_id,
  COUNT(*) as order_count,
  STRING_AGG(id::text, ', ') as order_ids,
  STRING_AGG(order_number, ', ') as order_numbers
FROM orders
WHERE razorpay_payment_id IN (
  'pay_S82FKkPoEM5yEk',
  'pay_S7yVokl4FmKHCw',
  'pay_S7lzh49gPLcMMt',
  'pay_S7lsCnFdtyWn5r',
  'pay_S7c02ct3bM3mnK',
  'pay_S7ZwMsB6thhMqq',
  'pay_S7MTymf7bD0uYy',
  'pay_S7CcXgjw7B2sjW',
  'pay_S79HNY2ky0Qou9'
)
GROUP BY razorpay_payment_id
HAVING COUNT(*) > 1;

-- ============================================================================
-- CHECK ORDER ITEMS FOR EACH ORDER
-- ============================================================================

SELECT 
  'ORDER ITEMS CHECK' as check_type,
  o.id as order_id,
  o.order_number,
  o.razorpay_payment_id,
  o.total_amount,
  COUNT(oi.id) as items_count,
  SUM(oi.total_price) as items_total,
  CASE 
    WHEN COUNT(oi.id) = 0 THEN '⚠️ NO ITEMS'
    WHEN ABS(SUM(oi.total_price) - o.subtotal) < 0.01 THEN '✅ ITEMS MATCH'
    ELSE '⚠️ ITEMS MISMATCH'
  END as items_status
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.razorpay_payment_id IN (
  'pay_S82FKkPoEM5yEk',
  'pay_S7yVokl4FmKHCw',
  'pay_S7lzh49gPLcMMt',
  'pay_S7ZwMsB6thhMqq',
  'pay_S7MTymf7bD0uYy',
  'pay_S7CcXgjw7B2sjW',
  'pay_S79HNY2ky0Qou9'
)
GROUP BY o.id, o.order_number, o.razorpay_payment_id, o.total_amount, o.subtotal
ORDER BY o.created_at DESC;
