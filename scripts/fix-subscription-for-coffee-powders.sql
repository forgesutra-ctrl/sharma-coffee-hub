-- ============================================================================
-- QUICK FIX: Enable Subscriptions for Coffee Powder Products
-- ============================================================================
-- This script will enable subscriptions for all Coffee Powder products
-- that have 1000g variants
-- ============================================================================

-- Step 1: Check current status
SELECT 
  p.id,
  p.name,
  p.subscription_eligible,
  c.name as category_name,
  EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000) as has_1000g,
  p.razorpay_plan_id as product_plan_id,
  (SELECT pv.razorpay_plan_id FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000 LIMIT 1) as variant_plan_id
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE (c.slug = 'coffee-powders' OR LOWER(c.name) LIKE '%coffee powder%')
  AND p.is_active = true
  AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000)
ORDER BY p.name;

-- Step 2: Enable subscription_eligible for all Coffee Powder products with 1000g variants
UPDATE products p
SET subscription_eligible = true
WHERE p.category_id IN (
  SELECT id FROM categories 
  WHERE slug = 'coffee-powders' 
     OR LOWER(name) LIKE '%coffee powder%'
     OR LOWER(name) = 'coffee powders'
)
AND EXISTS (
  SELECT 1 FROM product_variants pv 
  WHERE pv.product_id = p.id 
  AND pv.weight = 1000
)
AND p.is_active = true;

-- Step 3: Verify the update
SELECT 
  p.id,
  p.name,
  p.subscription_eligible,
  c.name as category_name,
  EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000) as has_1000g,
  CASE 
    WHEN p.razorpay_plan_id IS NOT NULL THEN 'Product has plan'
    WHEN EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000 AND pv.razorpay_plan_id IS NOT NULL) THEN 'Variant has plan'
    ELSE '⚠️ NEEDS PLAN ID'
  END as plan_status
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE (c.slug = 'coffee-powders' OR LOWER(c.name) LIKE '%coffee powder%')
  AND p.is_active = true
  AND p.subscription_eligible = true
ORDER BY p.name;
