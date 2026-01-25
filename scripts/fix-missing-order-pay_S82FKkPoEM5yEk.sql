-- ============================================================================
-- FIX MISSING ORDER: pay_S82FKkPoEM5yEk
-- ============================================================================
-- Payment Details:
-- Payment ID: pay_S82FKkPoEM5yEk
-- Order ID: order_S82FC7o8IoRlHW
-- Amount: ₹2,000.00
-- Date: Jan 25, 2026, 1:20pm (13:20:00)
-- Status: Captured
-- Customer: gitajayraman123@gmail.com, +91 9820 530525
-- Payment Method: UPI (gitajayaraman123@okicici)
-- 
-- This order was not created in the database even though payment was captured.
-- This script will create the missing order.
-- ============================================================================

-- First, check if order already exists (should not)
SELECT 
  'Checking for existing order' as step,
  id,
  order_number,
  razorpay_payment_id,
  razorpay_order_id,
  total_amount,
  created_at
FROM orders
WHERE razorpay_payment_id = 'pay_S82FKkPoEM5yEk'
   OR razorpay_order_id = 'order_S82FC7o8IoRlHW';

-- If no order exists, we need to create it
-- Note: We need customer details from Razorpay dashboard:
-- Email: gitajayraman123@gmail.com
-- Phone: +91 9820 530525
-- Amount: ₹2,000.00
-- Order ID: order_S82FC7o8IoRlHW

-- IMPORTANT: Before running the INSERT, you need to:
-- 1. Get the user_id if customer is registered (check by email)
-- 2. Get shipping address details (may need to check Razorpay payment details)
-- 3. Determine order items (what products were ordered for ₹2,000)

-- Step 1: Check if customer exists
SELECT 
  'Checking for customer' as step,
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'gitajayraman123@gmail.com';

-- Step 2: Check if there's a profile for this user
SELECT 
  'Checking for profile' as step,
  id,
  email,
  full_name
FROM profiles
WHERE email = 'gitajayraman123@gmail.com';

-- Step 3: Check if there's a pending_order with this Razorpay order ID
SELECT 
  'Checking pending_orders' as step,
  id,
  user_id,
  razorpay_order_id,
  total_amount,
  cart_data,
  shipping_address,
  created_at
FROM pending_orders
WHERE razorpay_order_id = 'order_S82FC7o8IoRlHW'
   OR total_amount = 2000.00
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Create the order
-- NOTE: You'll need to fill in:
-- - user_id (from Step 1, or NULL if guest)
-- - shipping_address (JSON with customer details)
-- - order items (what products were in the cart)
-- - subtotal, shipping_amount, etc.

-- Example order creation (ADJUST VALUES AS NEEDED):
/*
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
) VALUES (
  -- user_id: Get from Step 1, or NULL if guest order
  (SELECT id FROM auth.users WHERE email = 'gitajayraman123@gmail.com' LIMIT 1),
  
  -- order_number: Generate unique order number
  'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0'),
  
  -- status
  'confirmed',
  
  -- total_amount
  2000.00,
  
  -- subtotal (total - shipping)
  -- NOTE: Adjust based on actual cart items
  -- For ₹2000, likely no shipping (free shipping threshold or subscription)
  2000.00, -- Adjust if shipping was charged
  
  -- shipping_amount
  0.00, -- Adjust if shipping was charged
  
  -- shipping_charge
  0.00,
  
  -- payment_method
  'Online Payment',
  
  -- payment_type
  'prepaid',
  
  -- payment_status
  'paid',
  
  -- razorpay_order_id
  'order_S82FC7o8IoRlHW',
  
  -- razorpay_payment_id
  'pay_S82FKkPoEM5yEk',
  
  -- payment_verified
  true,
  
  -- payment_verified_at
  '2026-01-25 13:20:00'::timestamp,
  
  -- shipping_address (JSON)
  -- NOTE: You need to get actual address from Razorpay payment details
  jsonb_build_object(
    'email', 'gitajayraman123@gmail.com',
    'phone', '+919820530525',
    'fullName', 'Customer Name' -- UPDATE WITH ACTUAL NAME
    -- Add more address fields as needed:
    -- 'addressLine1', '...',
    -- 'city', '...',
    -- 'state', '...',
    -- 'pincode', '...'
  ),
  
  -- pincode
  NULL, -- UPDATE WITH ACTUAL PINCODE
  
  -- shipping_region
  'rest_of_india', -- UPDATE IF KNOWN
  
  -- created_at
  '2026-01-25 13:20:00'::timestamp,
  
  -- updated_at
  NOW()
)
RETURNING id, order_number;
*/

-- Step 5: After creating order, create order items
-- NOTE: You need to determine what products were in the cart
-- For ₹2,000, possible combinations:
-- - 2x 1000g products at ₹1000 each
-- - 1x 1000g product + shipping + other items
-- - Multiple smaller products
-- Check Razorpay payment notes, pending_orders cart_data, or contact customer

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
-- Example: 2x 1000g products (adjust based on actual cart)
(
  -- order_id: From Step 4 result
  'ORDER_ID_FROM_STEP_4',
  
  -- product_name: UPDATE WITH ACTUAL PRODUCT
  'Product Name 1',
  
  -- product_id: UPDATE WITH ACTUAL PRODUCT ID
  'PRODUCT_ID_1',
  
  -- weight: UPDATE WITH ACTUAL WEIGHT
  1000,
  
  -- quantity
  1,
  
  -- unit_price: UPDATE WITH ACTUAL PRICE
  1000.00,
  
  -- total_price
  1000.00,
  
  -- variant_id: UPDATE WITH ACTUAL VARIANT ID
  'VARIANT_ID_1'
),
(
  'ORDER_ID_FROM_STEP_4',
  'Product Name 2', -- UPDATE
  'PRODUCT_ID_2', -- UPDATE
  1000, -- UPDATE
  1,
  1000.00, -- UPDATE
  1000.00, -- UPDATE
  'VARIANT_ID_2' -- UPDATE
);

-- Make sure total_price of all items = subtotal (2000.00)
*/

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run Steps 1-3 to gather information
--    - Check if customer exists
--    - Check if there's a pending_order with cart_data (this is KEY!)
-- 2. If pending_order exists, use the cart_data to create order items
-- 3. Get shipping address details from Razorpay payment details page
-- 4. Determine what products were ordered (check payment notes or contact customer)
-- 5. Uncomment and adjust the INSERT statements in Steps 4-5
-- 6. Run the INSERT statements
-- 7. Verify the order was created correctly
-- ============================================================================

-- Verification query after creating order
SELECT 
  'VERIFICATION' as step,
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
