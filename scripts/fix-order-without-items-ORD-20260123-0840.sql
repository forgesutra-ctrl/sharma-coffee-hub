-- ============================================================================
-- FIX ORDER WITHOUT ITEMS: ORD-20260123-0840
-- ============================================================================
-- Order Details:
-- Order ID: bea0cf94-58fe-4ac2-8625-213a2596cedf
-- Order Number: ORD-20260123-0840
-- Payment ID: pay_S79HNY2ky0Qou9
-- Amount: ₹840.00
-- Date: Jan 23, 2026, 7:34am
-- Status: Order exists but has NO order items
-- 
-- This order was created but order_items were not inserted.
-- This script will help identify and fix the missing items.
-- ============================================================================

-- Step 1: Check order details
SELECT 
  'Order Details' as step,
  id,
  order_number,
  razorpay_payment_id,
  total_amount,
  subtotal,
  shipping_amount,
  payment_status,
  status,
  shipping_address,
  created_at
FROM orders
WHERE order_number = 'ORD-20260123-0840'
   OR razorpay_payment_id = 'pay_S79HNY2ky0Qou9';

-- Step 2: Check if order items exist (should be 0)
SELECT 
  'Current Order Items' as step,
  COUNT(*) as items_count
FROM order_items
WHERE order_id = 'bea0cf94-58fe-4ac2-8625-213a2596cedf';

-- Step 3: Get customer details from order
SELECT 
  'Customer Details' as step,
  (shipping_address->>'email')::text as email,
  (shipping_address->>'phone')::text as phone,
  (shipping_address->>'full_name')::text as full_name,
  (shipping_address->>'fullName')::text as fullName,
  shipping_address
FROM orders
WHERE id = 'bea0cf94-58fe-4ac2-8625-213a2596cedf';

-- Step 4: Check if there's a pending_order that might have cart data
SELECT 
  'Checking pending_orders' as step,
  id,
  user_id,
  razorpay_order_id,
  total_amount,
  cart_data,
  created_at
FROM pending_orders
WHERE razorpay_order_id IN (
  SELECT razorpay_order_id 
  FROM orders 
  WHERE id = 'bea0cf94-58fe-4ac2-8625-213a2596cedf'
)
OR total_amount = 840.00
ORDER BY created_at DESC
LIMIT 5;

-- Step 5: Check similar orders around the same time to infer what might have been ordered
SELECT 
  'Similar Orders (Same Day)' as step,
  o.id,
  o.order_number,
  o.total_amount,
  o.created_at,
  oi.product_name,
  oi.weight,
  oi.quantity,
  oi.unit_price
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE DATE(o.created_at) = '2026-01-23'
  AND o.total_amount BETWEEN 800 AND 900
  AND o.id != 'bea0cf94-58fe-4ac2-8625-213a2596cedf'
ORDER BY o.created_at;

-- ============================================================================
-- TO FIX: Create order items
-- ============================================================================
-- You need to determine what products were in the cart.
-- Options:
-- 1. Check Razorpay payment notes/details
-- 2. Contact customer (email/phone from shipping_address)
-- 3. Check similar orders from same time period
-- 4. Check if there's a pending_order with cart_data
--
-- Once you know the products, create the order items:
-- ============================================================================

-- Example: If you know the products, create order items
-- NOTE: Adjust product details based on actual cart contents
/*
INSERT INTO order_items (
  order_id,
  product_name,
  product_id,
  weight,
  quantity,
  unit_price,
  total_price,
  variant_id
) VALUES 
-- Example item 1 (adjust values):
(
  'bea0cf94-58fe-4ac2-8625-213a2596cedf',
  'Product Name 1', -- UPDATE
  'PRODUCT_ID_1', -- UPDATE
  250, -- UPDATE
  1, -- UPDATE
  420.00, -- UPDATE
  420.00, -- UPDATE
  'VARIANT_ID_1' -- UPDATE
),
-- Example item 2 (if multiple items):
(
  'bea0cf94-58fe-4ac2-8625-213a2596cedf',
  'Product Name 2', -- UPDATE
  'PRODUCT_ID_2', -- UPDATE
  250, -- UPDATE
  1, -- UPDATE
  420.00, -- UPDATE
  420.00, -- UPDATE
  'VARIANT_ID_2' -- UPDATE
);

-- Make sure total_price of all items = subtotal (840.00)
-- If shipping was charged, items_total + shipping = total_amount
*/

-- ============================================================================
-- ALTERNATIVE: If you can't determine the exact products
-- ============================================================================
-- You can create a placeholder item with the total amount:
/*
INSERT INTO order_items (
  order_id,
  product_name,
  product_id,
  weight,
  quantity,
  unit_price,
  total_price,
  variant_id
) VALUES (
  'bea0cf94-58fe-4ac2-8625-213a2596cedf',
  'Unknown Product - Needs Verification',
  NULL,
  0,
  1,
  840.00,
  840.00,
  NULL
);
*/

-- ============================================================================
-- VERIFICATION: After creating items
-- ============================================================================
SELECT 
  'VERIFICATION' as step,
  o.id,
  o.order_number,
  o.total_amount,
  o.subtotal,
  COUNT(oi.id) as items_count,
  SUM(oi.total_price) as items_total,
  CASE 
    WHEN COUNT(oi.id) = 0 THEN '⚠️ STILL NO ITEMS'
    WHEN ABS(SUM(oi.total_price) - o.subtotal) < 0.01 THEN '✅ ITEMS MATCH'
    ELSE '⚠️ AMOUNT MISMATCH'
  END as status
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.id = 'bea0cf94-58fe-4ac2-8625-213a2596cedf'
GROUP BY o.id, o.order_number, o.total_amount, o.subtotal;

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run Steps 1-4 to gather information
-- 2. Check Razorpay payment details for cart information
-- 3. Contact customer if needed (email/phone from shipping_address)
-- 4. Check similar orders to infer what might have been ordered
-- 5. Create order items based on findings
-- 6. Run verification query to confirm fix
-- ============================================================================
