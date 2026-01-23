-- Backfill Missing Orders from Razorpay
-- These 3 payments were captured but orders were not created in Supabase
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check if customers exist in database (by email)
-- ============================================================================
SELECT 
  'Customer Check' as check_type,
  u.email,
  u.id as user_id,
  p.id as profile_id,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ User exists'
    ELSE '❌ User not found'
  END as status
FROM (VALUES
  ('preethisudhar@gmail.com'),
  ('sourav.ghosh2006@gmail.com'),
  ('annageorge@baselius.ac.in')
) AS emails(email)
LEFT JOIN auth.users u ON u.email = emails.email
LEFT JOIN public.profiles p ON p.id = u.id;

-- ============================================================================
-- STEP 2: Create Missing Orders
-- ============================================================================

-- Order 1: ₹840 - Preethi Sudhar
-- Razorpay: order_S79HGNQMjgTa09, payment: pay_S79HNY2ky0Qou9
INSERT INTO public.orders (
  user_id,
  order_number,
  status,
  total_amount,
  subtotal,
  discount_amount,
  shipping_amount,
  shipping_charge,
  shipping_address,
  payment_method,
  payment_status,
  payment_type,
  razorpay_order_id,
  razorpay_payment_id,
  payment_verified,
  payment_verified_at,
  created_at
)
SELECT 
  COALESCE(u.id, NULL) as user_id,  -- Will be NULL if user doesn't exist
  'ORD-20260123-0840' as order_number,
  'confirmed'::order_status as status,
  840.00 as total_amount,
  840.00 as subtotal,
  0.00 as discount_amount,
  0.00 as shipping_amount,
  0.00 as shipping_charge,
  jsonb_build_object(
    'fullName', 'Preethi Sudhar',
    'email', 'preethisudhar@gmail.com',
    'phone', '9940010785',
    'addressLine1', 'Address to be confirmed',
    'addressLine2', '',
    'city', 'City to be confirmed',
    'state', 'State to be confirmed',
    'pincode', '000000',
    'landmark', ''
  ) as shipping_address,
  'razorpay' as payment_method,
  'paid' as payment_status,
  'prepaid' as payment_type,
  'order_S79HGNQMjgTa09' as razorpay_order_id,
  'pay_S79HNY2ky0Qou9' as razorpay_payment_id,
  true as payment_verified,
  '2026-01-23 07:34:39+00'::timestamptz as payment_verified_at,
  '2026-01-23 07:34:39+00'::timestamptz as created_at
FROM (SELECT 1) dummy
LEFT JOIN auth.users u ON u.email = 'preethisudhar@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.orders WHERE razorpay_order_id = 'order_S79HGNQMjgTa09'
)
RETURNING id, order_number;

-- Order 2: ₹1,300 - Sourav Ghosh
-- Razorpay: order_S6vr5AUI9uWcsn, payment: pay_S6vrFAa81xvHHD
INSERT INTO public.orders (
  user_id,
  order_number,
  status,
  total_amount,
  subtotal,
  discount_amount,
  shipping_amount,
  shipping_charge,
  shipping_address,
  payment_method,
  payment_status,
  payment_type,
  razorpay_order_id,
  razorpay_payment_id,
  payment_verified,
  payment_verified_at,
  created_at
)
SELECT 
  COALESCE(u.id, NULL) as user_id,  -- Will be NULL if user doesn't exist
  'ORD-20260122-1300' as order_number,
  'confirmed'::order_status as status,
  1300.00 as total_amount,
  1300.00 as subtotal,
  0.00 as discount_amount,
  0.00 as shipping_amount,
  0.00 as shipping_charge,
  jsonb_build_object(
    'fullName', 'Sourav Ghosh',
    'email', 'sourav.ghosh2006@gmail.com',
    'phone', '7718033203',
    'addressLine1', 'Address to be confirmed',
    'addressLine2', '',
    'city', 'City to be confirmed',
    'state', 'State to be confirmed',
    'pincode', '000000',
    'landmark', ''
  ) as shipping_address,
  'razorpay' as payment_method,
  'paid' as payment_status,
  'prepaid' as payment_type,
  'order_S6vr5AUI9uWcsn' as razorpay_order_id,
  'pay_S6vrFAa81xvHHD' as razorpay_payment_id,
  true as payment_verified,
  '2026-01-22 18:26:51+00'::timestamptz as payment_verified_at,
  '2026-01-22 18:26:51+00'::timestamptz as created_at
FROM (SELECT 1) dummy
LEFT JOIN auth.users u ON u.email = 'sourav.ghosh2006@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.orders WHERE razorpay_order_id = 'order_S6vr5AUI9uWcsn'
)
RETURNING id, order_number;

-- Order 3: ₹990 - Anna George
-- Razorpay: order_S6utVpm2FjCW7O, payment: pay_S6uthEIjGptl9K
INSERT INTO public.orders (
  user_id,
  order_number,
  status,
  total_amount,
  subtotal,
  discount_amount,
  shipping_amount,
  shipping_charge,
  shipping_address,
  payment_method,
  payment_status,
  payment_type,
  razorpay_order_id,
  razorpay_payment_id,
  payment_verified,
  payment_verified_at,
  created_at
)
SELECT 
  COALESCE(u.id, NULL) as user_id,  -- Will be NULL if user doesn't exist
  'ORD-20260122-0990' as order_number,
  'confirmed'::order_status as status,
  990.00 as total_amount,
  990.00 as subtotal,
  0.00 as discount_amount,
  0.00 as shipping_amount,
  0.00 as shipping_charge,
  jsonb_build_object(
    'fullName', 'Anna George',
    'email', 'annageorge@baselius.ac.in',
    'phone', '9495109102',
    'addressLine1', 'Address to be confirmed',
    'addressLine2', '',
    'city', 'City to be confirmed',
    'state', 'State to be confirmed',
    'pincode', '000000',
    'landmark', ''
  ) as shipping_address,
  'razorpay' as payment_method,
  'paid' as payment_status,
  'prepaid' as payment_type,
  'order_S6utVpm2FjCW7O' as razorpay_order_id,
  'pay_S6uthEIjGptl9K' as razorpay_payment_id,
  true as payment_verified,
  '2026-01-22 17:30:27+00'::timestamptz as payment_verified_at,
  '2026-01-22 17:30:27+00'::timestamptz as created_at
FROM (SELECT 1) dummy
LEFT JOIN auth.users u ON u.email = 'annageorge@baselius.ac.in'
WHERE NOT EXISTS (
  SELECT 1 FROM public.orders WHERE razorpay_order_id = 'order_S6utVpm2FjCW7O'
)
RETURNING id, order_number;

-- ============================================================================
-- STEP 3: Verify Orders Were Created
-- ============================================================================
SELECT 
  'Verification' as check_type,
  order_number,
  total_amount,
  razorpay_order_id,
  razorpay_payment_id,
  (shipping_address->>'fullName') as customer_name,
  (shipping_address->>'email') as customer_email,
  (shipping_address->>'phone') as customer_phone,
  created_at
FROM public.orders
WHERE razorpay_order_id IN (
  'order_S79HGNQMjgTa09',  -- ₹840
  'order_S6vr5AUI9uWcsn',  -- ₹1,300
  'order_S6utVpm2FjCW7O'   -- ₹990
)
ORDER BY created_at;

-- ============================================================================
-- STEP 4: Update Shipping Addresses (if you have the full addresses)
-- ============================================================================
-- After running the above, if you have the complete shipping addresses,
-- you can update them like this:

/*
UPDATE public.orders
SET shipping_address = jsonb_build_object(
  'fullName', 'Preethi Sudhar',
  'email', 'preethisudhar@gmail.com',
  'phone', '+919940010785',
  'addressLine1', 'FULL ADDRESS LINE 1 HERE',
  'addressLine2', 'FULL ADDRESS LINE 2 HERE',
  'city', 'CITY NAME',
  'state', 'STATE NAME',
  'pincode', 'PINCODE',
  'landmark', 'LANDMARK IF ANY'
)
WHERE razorpay_order_id = 'order_S79HGNQMjgTa09';

-- Repeat for the other 2 orders with their addresses
*/
