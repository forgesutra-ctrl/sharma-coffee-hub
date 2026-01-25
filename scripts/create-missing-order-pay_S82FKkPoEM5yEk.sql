-- ============================================================================
-- CREATE MISSING ORDER: pay_S82FKkPoEM5yEk
-- ============================================================================
-- Payment ID: pay_S82FKkPoEM5yEk
-- Order ID: order_S82FC7o8IoRlHW
-- Amount: ₹2,000.00
-- Date: Jan 25, 2026, 1:20pm
-- Customer: gitajayraman123@gmail.com, 9820530525
-- ============================================================================

-- Step 1: Check if order already exists
SELECT 
  'Step 1: Checking for existing order' as step,
  id,
  order_number,
  razorpay_payment_id,
  razorpay_order_id,
  total_amount
FROM orders
WHERE razorpay_payment_id = 'pay_S82FKkPoEM5yEk'
   OR razorpay_order_id = 'order_S82FC7o8IoRlHW';

-- Step 2: Check for pending_order with cart data (IMPORTANT!)
SELECT 
  'Step 2: Checking pending_orders for cart data' as step,
  id,
  user_id,
  razorpay_order_id,
  total_amount,
  cart_data,
  shipping_address,
  created_at
FROM pending_orders
WHERE razorpay_order_id = 'order_S82FC7o8IoRlHW'
   OR (total_amount = 2000.00 AND created_at::date = '2026-01-25'::date)
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Get customer user_id (if registered)
SELECT 
  'Step 3: Customer user_id' as step,
  id as user_id,
  email
FROM auth.users
WHERE email = 'gitajayraman123@gmail.com'
LIMIT 1;

-- Step 4: Create the order
INSERT INTO orders (
  user_id,
  order_number,
  status,
  total_amount,
  subtotal,
  shipping_amount,
  shipping_charge,
  payment_method,
  payment_type,
  payment_status,
  razorpay_order_id,
  razorpay_payment_id,
  payment_verified,
  payment_verified_at,
  shipping_address,
  pincode,
  shipping_region,
  created_at,
  updated_at
)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'gitajayraman123@gmail.com' LIMIT 1) as user_id,
  'ORD-' || TO_CHAR('2026-01-25 13:20:00'::timestamp, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0') as order_number,
  'confirmed' as status,
  2000.00 as total_amount,
  2000.00 as subtotal,
  0.00 as shipping_amount,
  0.00 as shipping_charge,
  'Online Payment' as payment_method,
  'prepaid' as payment_type,
  'paid' as payment_status,
  'order_S82FC7o8IoRlHW' as razorpay_order_id,
  'pay_S82FKkPoEM5yEk' as razorpay_payment_id,
  true as payment_verified,
  '2026-01-25 13:20:00'::timestamp as payment_verified_at,
  COALESCE(
    (SELECT shipping_address FROM pending_orders WHERE razorpay_order_id = 'order_S82FC7o8IoRlHW' LIMIT 1),
    jsonb_build_object(
      'email', 'gitajayraman123@gmail.com',
      'phone', '9820530525', -- 10-digit format (no +91)
      'fullName', 'Customer' -- UPDATE: Get actual name from Razorpay dashboard
    )
  ) as shipping_address,
  NULL as pincode, -- UPDATE: Get pincode from Razorpay dashboard or pending_order
  'rest_of_india' as shipping_region, -- UPDATE: Adjust based on pincode
  '2026-01-25 13:20:00'::timestamp as created_at,
  NOW() as updated_at
RETURNING id, order_number;

-- Step 5: Create order items from pending_order cart_data if available
-- This will only insert if pending_order has cart_data
WITH new_order AS (
  SELECT id as order_id
  FROM orders
  WHERE razorpay_payment_id = 'pay_S82FKkPoEM5yEk'
  ORDER BY created_at DESC
  LIMIT 1
),
pending_cart AS (
  SELECT cart_data
  FROM pending_orders
  WHERE razorpay_order_id = 'order_S82FC7o8IoRlHW'
    AND cart_data IS NOT NULL
  LIMIT 1
)
INSERT INTO order_items (
  order_id,
  product_name,
  product_id,
  weight,
  quantity,
  unit_price,
  total_price,
  variant_id
)
SELECT 
  new_order.order_id,
  COALESCE(item->>'product_name', item->>'name', 'Unknown Product') as product_name,
  NULLIF(item->>'product_id', '')::uuid as product_id,
  COALESCE((item->>'weight')::integer, 0) as weight,
  COALESCE((item->>'quantity')::integer, 1) as quantity,
  COALESCE((item->>'unit_price')::numeric, (item->>'price')::numeric, 0) as unit_price,
  COALESCE(
    (item->>'total_price')::numeric,
    ((item->>'price')::numeric * (item->>'quantity')::integer),
    0
  ) as total_price,
  NULLIF(item->>'variant_id', '')::uuid as variant_id
FROM new_order
CROSS JOIN pending_cart
CROSS JOIN jsonb_array_elements(pending_cart.cart_data) AS item;

-- Step 5B: If Step 5 didn't create items (no pending_order cart_data), create manually
-- Run this ONLY if Step 7 shows 0 items
-- UPDATE the product details with actual values from Razorpay payment notes
WITH new_order AS (
  SELECT id as order_id
  FROM orders
  WHERE razorpay_payment_id = 'pay_S82FKkPoEM5yEk'
  ORDER BY created_at DESC
  LIMIT 1
),
order_items_check AS (
  SELECT COUNT(*) as items_count
  FROM order_items oi
  JOIN new_order no ON oi.order_id = no.order_id
)
INSERT INTO order_items (
  order_id,
  product_name,
  product_id,
  weight,
  quantity,
  unit_price,
  total_price,
  variant_id
)
SELECT 
  new_order.order_id,
  'Product Name 1' as product_name, -- UPDATE: Get from Razorpay payment notes
  NULL::uuid as product_id, -- UPDATE: Get actual product_id
  1000 as weight, -- UPDATE: Adjust based on actual variant
  1 as quantity,
  1000.00 as unit_price, -- UPDATE: Adjust based on actual price
  1000.00 as total_price, -- UPDATE: Adjust based on actual total
  NULL::uuid as variant_id -- UPDATE: Get actual variant_id
FROM new_order, order_items_check
WHERE order_items_check.items_count = 0
UNION ALL
SELECT 
  new_order.order_id,
  'Product Name 2' as product_name, -- UPDATE: Get from Razorpay payment notes
  NULL::uuid as product_id, -- UPDATE: Get actual product_id
  1000 as weight, -- UPDATE: Adjust based on actual variant
  1 as quantity,
  1000.00 as unit_price, -- UPDATE: Adjust based on actual price
  1000.00 as total_price, -- UPDATE: Adjust based on actual total
  NULL::uuid as variant_id -- UPDATE: Get actual variant_id
FROM new_order, order_items_check
WHERE order_items_check.items_count = 0;

-- Step 6: Delete pending_order if it was used
DELETE FROM pending_orders
WHERE razorpay_order_id = 'order_S82FC7o8IoRlHW'
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE razorpay_payment_id = 'pay_S82FKkPoEM5yEk'
  );

-- Step 7: Verification - Check if order was created successfully
SELECT 
  'Step 7: Verification' as step,
  o.id,
  o.order_number,
  o.razorpay_payment_id,
  o.razorpay_order_id,
  o.total_amount,
  o.payment_status,
  o.status,
  COUNT(oi.id) as items_count,
  SUM(oi.total_price) as items_total,
  o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.razorpay_payment_id = 'pay_S82FKkPoEM5yEk'
   OR o.razorpay_order_id = 'order_S82FC7o8IoRlHW'
GROUP BY o.id, o.order_number, o.razorpay_payment_id, o.razorpay_order_id, o.total_amount, o.payment_status, o.status, o.created_at;

-- Step 8: Verify order is visible to admins
SELECT 
  'Step 8: Admin Visibility Check' as step,
  o.id,
  o.order_number,
  o.total_amount,
  o.status,
  o.payment_status,
  (o.shipping_address->>'email')::text as customer_email,
  (o.shipping_address->>'phone')::text as customer_phone,
  COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.razorpay_payment_id = 'pay_S82FKkPoEM5yEk'
   OR o.razorpay_order_id = 'order_S82FC7o8IoRlHW'
GROUP BY o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.shipping_address;
