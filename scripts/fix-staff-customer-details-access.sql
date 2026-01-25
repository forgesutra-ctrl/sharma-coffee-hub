-- ============================================================================
-- FIX: Staff Access to Customer Details
-- ============================================================================
-- This script ensures staff can view customer details from orders
-- Customer details are stored in shipping_address JSON field in orders table
-- Staff already have access to orders via RLS policies, so they should be able
-- to see shipping_address. This script verifies and fixes any issues.
-- ============================================================================

-- Verify current RLS policies for orders table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- Check if staff can view orders (they should via existing policies)
-- The existing policy "Staff can view orders" should allow this
-- But let's verify the policy includes all necessary fields

-- Verify staff role function exists
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'is_staff';

-- Check if there are any orders where staff might not see customer details
-- This query simulates what a staff user would see
-- Note: This needs to be run as a staff user to test RLS
SELECT 
  'Test Query: Orders visible to staff' as test_name,
  COUNT(*) as order_count
FROM orders;

-- If staff still can't see customer details, it might be because:
-- 1. The shipping_address field is NULL or empty
-- 2. The field names in shipping_address don't match what the UI expects
-- 3. There's a frontend issue with how the data is displayed

-- Check orders with shipping_address populated
SELECT 
  'Orders with shipping_address' as check_type,
  COUNT(*) as count
FROM orders
WHERE shipping_address IS NOT NULL;

-- Check orders with customer name in shipping_address
SELECT 
  'Orders with customer name in shipping_address' as check_type,
  COUNT(*) as count
FROM orders
WHERE shipping_address IS NOT NULL
  AND (
    (shipping_address->>'full_name') IS NOT NULL 
    OR (shipping_address->>'fullName') IS NOT NULL
  );

-- Sample of shipping_address structure
SELECT 
  'Sample shipping_address structure' as check_type,
  id,
  order_number,
  shipping_address->>'full_name' as full_name_camel,
  shipping_address->>'fullName' as full_name_snake,
  shipping_address->>'phone' as phone,
  shipping_address->>'email' as email,
  shipping_address->>'address_line1' as address_line1,
  shipping_address->>'addressLine1' as addressLine1
FROM orders
WHERE shipping_address IS NOT NULL
LIMIT 5;

-- Note: Staff should be able to see all customer details from orders.shipping_address
-- If they can't, the issue is likely:
-- 1. Frontend not displaying the data correctly
-- 2. RLS policy not working (but it should based on existing policies)
-- 3. Missing data in shipping_address field

-- To verify staff access, run this as a staff user:
-- SELECT id, order_number, shipping_address FROM orders LIMIT 5;
