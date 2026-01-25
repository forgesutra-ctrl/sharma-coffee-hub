-- ============================================================================
-- FIX MISSING ORDER: pay_S7lzh49gPLcMMt
-- ============================================================================
-- Payment Details:
-- Payment ID: pay_S7lzh49gPLcMMt
-- Amount: ₹230.00
-- Date: Jan 24, 2026, 9:27pm
-- Status: Captured
-- Customer: miteshjogi@gmail.com, +91 9867 420571
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
  total_amount,
  created_at
FROM orders
WHERE razorpay_payment_id = 'pay_S7lzh49gPLcMMt';

-- If no order exists, we need to create it
-- Note: We need customer details from Razorpay dashboard:
-- Email: miteshjogi@gmail.com
-- Phone: +91 9867 420571
-- Amount: ₹230.00

-- IMPORTANT: Before running the INSERT, you need to:
-- 1. Get the user_id if customer is registered (check by email)
-- 2. Get shipping address details (may need to check Razorpay payment details)
-- 3. Determine order items (what products were ordered)

-- Step 1: Check if customer exists
SELECT 
  'Checking for customer' as step,
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'miteshjogi@gmail.com';

-- Step 2: Check if there's a profile for this user
SELECT 
  'Checking for profile' as step,
  id,
  email,
  full_name
FROM profiles
WHERE email = 'miteshjogi@gmail.com';

-- Step 3: Create the order
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
  (SELECT id FROM auth.users WHERE email = 'miteshjogi@gmail.com' LIMIT 1),
  
  -- order_number: Generate unique order number
  'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0'),
  
  -- status
  'confirmed',
  
  -- total_amount
  230.00,
  
  -- subtotal (total - shipping)
  -- NOTE: Adjust based on actual cart items
  230.00, -- Assuming no shipping for this amount, adjust if needed
  
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
  
  -- razorpay_payment_id
  'pay_S7lzh49gPLcMMt',
  
  -- payment_verified
  true,
  
  -- payment_verified_at
  '2026-01-24 21:27:00'::timestamp,
  
  -- shipping_address (JSON)
  -- NOTE: You need to get actual address from Razorpay payment details
  jsonb_build_object(
    'email', 'miteshjogi@gmail.com',
    'phone', '+919867420571',
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
  '2026-01-24 21:27:00'::timestamp,
  
  -- updated_at
  NOW()
)
RETURNING id, order_number;
*/

-- Step 4: After creating order, create order items
-- NOTE: You need to determine what products were in the cart
-- Check Razorpay payment notes or contact customer if needed
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
  -- order_id: From Step 3 result
  'ORDER_ID_FROM_STEP_3',
  
  -- product_name: UPDATE WITH ACTUAL PRODUCT
  'Product Name',
  
  -- product_id: UPDATE WITH ACTUAL PRODUCT ID
  'PRODUCT_ID',
  
  -- weight: UPDATE WITH ACTUAL WEIGHT
  250,
  
  -- quantity
  1,
  
  -- unit_price: UPDATE WITH ACTUAL PRICE
  230.00,
  
  -- total_price
  230.00,
  
  -- variant_id: UPDATE WITH ACTUAL VARIANT ID
  'VARIANT_ID'
);
*/

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run Steps 1-2 to check if customer exists
-- 2. Get shipping address details from Razorpay payment details page
-- 3. Determine what products were ordered (check payment notes or contact customer)
-- 4. Uncomment and adjust the INSERT statements in Steps 3-4
-- 5. Run the INSERT statements
-- 6. Verify the order was created correctly
-- ============================================================================

-- Verification query after creating order
SELECT 
  'VERIFICATION' as step,
  o.id,
  o.order_number,
  o.razorpay_payment_id,
  o.total_amount,
  o.payment_status,
  o.status,
  COUNT(oi.id) as items_count,
  o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.razorpay_payment_id = 'pay_S7lzh49gPLcMMt'
GROUP BY o.id, o.order_number, o.razorpay_payment_id, o.total_amount, o.payment_status, o.status, o.created_at;
