-- ============================================================================
-- CREATE MISSING ORDER: pay_S7lzh49gPLcMMt
-- ============================================================================
-- Payment ID: pay_S7lzh49gPLcMMt
-- Amount: ₹230.00
-- Date: Jan 24, 2026, 9:27pm
-- Customer: miteshjogi@gmail.com, +91 9867 420571
-- ============================================================================

-- Step 1: Check if order already exists
SELECT 
  'Step 1: Checking for existing order' as step,
  id,
  order_number,
  razorpay_payment_id,
  total_amount
FROM orders
WHERE razorpay_payment_id = 'pay_S7lzh49gPLcMMt';

-- Step 2: Get customer user_id (if registered)
SELECT 
  'Step 2: Customer user_id' as step,
  id as user_id,
  email
FROM auth.users
WHERE email = 'miteshjogi@gmail.com'
LIMIT 1;

-- Step 3: Create the order
-- NOTE: Replace 'USER_ID_HERE' with the user_id from Step 2, or use NULL for guest
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
  (SELECT id FROM auth.users WHERE email = 'miteshjogi@gmail.com' LIMIT 1) as user_id,
  'ORD-' || TO_CHAR('2026-01-24 21:27:00'::timestamp, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0') as order_number,
  'confirmed' as status,
  230.00 as total_amount,
  230.00 as subtotal,
  0.00 as shipping_amount,
  0.00 as shipping_charge,
  'Online Payment' as payment_method,
  'prepaid' as payment_type,
  'paid' as payment_status,
  'pay_S7lzh49gPLcMMt' as razorpay_payment_id,
  true as payment_verified,
  '2026-01-24 21:27:00'::timestamp as payment_verified_at,
  jsonb_build_object(
    'email', 'miteshjogi@gmail.com',
    'phone', '9867420571', -- 10-digit format (no +91)
    'fullName', 'Customer' -- UPDATE: Get actual name from Razorpay dashboard
  ) as shipping_address,
  NULL as pincode, -- UPDATE: Get pincode from Razorpay dashboard
  'rest_of_india' as shipping_region, -- UPDATE: Adjust based on pincode
  '2026-01-24 21:27:00'::timestamp as created_at,
  NOW() as updated_at
RETURNING id, order_number;

-- Step 4: Create order items
-- NOTE: After Step 3, copy the order_id from the result and use it below
-- Replace 'ORDER_ID_FROM_STEP_3' with the actual order_id
-- Also UPDATE product details with actual values

-- First, get the order_id we just created
WITH new_order AS (
  SELECT id as order_id
  FROM orders
  WHERE razorpay_payment_id = 'pay_S7lzh49gPLcMMt'
  ORDER BY created_at DESC
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
  'Product Name' as product_name, -- UPDATE: Get from Razorpay payment notes or contact customer
  NULL::uuid as product_id, -- UPDATE: Get actual product_id from products table
  250 as weight, -- UPDATE: Adjust based on actual product variant
  1 as quantity,
  230.00 as unit_price, -- UPDATE: Adjust based on actual price
  230.00 as total_price, -- UPDATE: Adjust based on actual total
  NULL::uuid as variant_id -- UPDATE: Get actual variant_id from product_variants table
FROM new_order;

-- Step 5: Verification - Check if order was created successfully
SELECT 
  'Step 5: Verification' as step,
  o.id,
  o.order_number,
  o.razorpay_payment_id,
  o.total_amount,
  o.payment_status,
  o.status,
  COUNT(oi.id) as items_count,
  SUM(oi.total_price) as items_total,
  o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.razorpay_payment_id = 'pay_S7lzh49gPLcMMt'
GROUP BY o.id, o.order_number, o.razorpay_payment_id, o.total_amount, o.payment_status, o.status, o.created_at;

-- Step 6: Verify order is visible to admins
SELECT 
  'Step 6: Admin Visibility Check' as step,
  o.id,
  o.order_number,
  o.total_amount,
  o.status,
  o.payment_status,
  (o.shipping_address->>'email')::text as customer_email,
  (o.shipping_address->>'phone')::text as customer_phone
FROM orders o
WHERE o.razorpay_payment_id = 'pay_S7lzh49gPLcMMt';
