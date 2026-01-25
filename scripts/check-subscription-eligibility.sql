-- ============================================================================
-- DIAGNOSTIC: Check Subscription Eligibility for Products
-- ============================================================================
-- Run this to see which products should show subscription options
-- ============================================================================

-- Check all products and their subscription eligibility status
SELECT 
  p.id,
  p.name,
  p.slug,
  p.subscription_eligible,
  p.razorpay_plan_id as product_plan_id,
  c.id as category_id,
  c.name as category_name,
  c.slug as category_slug,
  -- Check if product is in Coffee Powders category
  CASE 
    WHEN c.slug = 'coffee-powders' OR LOWER(c.name) LIKE '%coffee powder%' THEN '✅ Coffee Powder'
    ELSE '❌ Not Coffee Powder'
  END as category_status,
  -- Check if product has 1000g variant
  EXISTS (
    SELECT 1 FROM product_variants pv 
    WHERE pv.product_id = p.id 
    AND pv.weight = 1000
  ) as has_1000g_variant,
  -- Get 1000g variant details
  (SELECT pv.id FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000 LIMIT 1) as kg_variant_id,
  (SELECT pv.razorpay_plan_id FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000 LIMIT 1) as kg_variant_plan_id,
  -- Overall eligibility
  CASE 
    WHEN p.subscription_eligible = true 
      AND (c.slug = 'coffee-powders' OR LOWER(c.name) LIKE '%coffee powder%')
      AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000)
      AND (
        p.razorpay_plan_id IS NOT NULL 
        OR EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000 AND pv.razorpay_plan_id IS NOT NULL)
      )
    THEN '✅ ELIGIBLE'
    ELSE '❌ NOT ELIGIBLE'
  END as subscription_status,
  -- Missing requirements
  CASE 
    WHEN p.subscription_eligible != true THEN 'Missing: subscription_eligible = true'
    WHEN NOT (c.slug = 'coffee-powders' OR LOWER(c.name) LIKE '%coffee powder%') THEN 'Missing: Coffee Powders category'
    WHEN NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000) THEN 'Missing: 1000g variant'
    WHEN p.razorpay_plan_id IS NULL 
      AND NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000 AND pv.razorpay_plan_id IS NOT NULL)
    THEN 'Missing: razorpay_plan_id'
    ELSE 'All requirements met'
  END as missing_requirements
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true
ORDER BY 
  CASE 
    WHEN p.subscription_eligible = true 
      AND (c.slug = 'coffee-powders' OR LOWER(c.name) LIKE '%coffee powder%')
      AND EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.weight = 1000)
    THEN 0
    ELSE 1
  END,
  p.name;

-- ============================================================================
-- Check Coffee Powders category specifically
-- ============================================================================
SELECT 
  id,
  name,
  slug,
  parent_id
FROM categories
WHERE slug = 'coffee-powders'
   OR LOWER(name) LIKE '%coffee powder%'
   OR LOWER(name) = 'coffee powders';

-- ============================================================================
-- Check products in Coffee Powders category
-- ============================================================================
SELECT 
  p.id,
  p.name,
  p.subscription_eligible,
  c.name as category_name,
  c.slug as category_slug
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE (c.slug = 'coffee-powders' OR LOWER(c.name) LIKE '%coffee powder%')
  AND p.is_active = true
ORDER BY p.name;

-- ============================================================================
-- Check 1000g variants for Coffee Powder products
-- ============================================================================
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.subscription_eligible,
  pv.id as variant_id,
  pv.weight,
  pv.price,
  pv.razorpay_plan_id as variant_plan_id,
  p.razorpay_plan_id as product_plan_id,
  CASE 
    WHEN pv.razorpay_plan_id IS NOT NULL THEN 'Variant has plan'
    WHEN p.razorpay_plan_id IS NOT NULL THEN 'Product has plan'
    ELSE '❌ NO PLAN ID'
  END as plan_status
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN product_variants pv ON pv.product_id = p.id
WHERE (c.slug = 'coffee-powders' OR LOWER(c.name) LIKE '%coffee powder%')
  AND p.is_active = true
  AND pv.weight = 1000
ORDER BY p.name;
