-- Map Razorpay Plan IDs to Product Variants
-- Run this after creating all Razorpay plans in dashboard
-- Update the plan IDs based on your actual Razorpay dashboard

-- Coffee Oasis (200g) → ₹50
UPDATE product_variants
SET razorpay_plan_id = 'plan_S5nuEPvsQTjAyW'
WHERE sku LIKE '%Coffee Oasis%' OR (weight = 200 AND product_id IN (
  SELECT id FROM products WHERE name ILIKE '%Coffee Oasis%'
));

-- Coffee Chocolate Bar (100g) → ₹150
UPDATE product_variants
SET razorpay_plan_id = 'plan_S5np6RSuQYzuvK'
WHERE sku LIKE '%Coffee Chocolate Bar%' OR (weight = 100 AND product_id IN (
  SELECT id FROM products WHERE name ILIKE '%Coffee Chocolate Bar%'
));

-- Coorg Classic 250g → ₹220
UPDATE product_variants
SET razorpay_plan_id = 'plan_S61lqYZe6Vm3Ma'
WHERE weight = 250 AND product_id IN (
  SELECT id FROM products WHERE name ILIKE '%Coorg Classic%'
);

-- Coorg Classic 500g → ₹430
UPDATE product_variants
SET razorpay_plan_id = 'plan_S61IMPNWJcc7il'
WHERE weight = 500 AND product_id IN (
  SELECT id FROM products WHERE name ILIKE '%Coorg Classic%'
);

-- Coorg Classic 1000g → ₹860
UPDATE product_variants
SET razorpay_plan_id = 'plan_S5nxVAbJAn7Col'
WHERE weight = 1000 AND product_id IN (
  SELECT id FROM products WHERE name ILIKE '%Coorg Classic%'
);

-- Verify updates
SELECT 
  pv.id,
  p.name as product_name,
  pv.weight,
  pv.price,
  pv.razorpay_plan_id,
  CASE 
    WHEN pv.razorpay_plan_id IS NULL THEN '❌ Missing Plan'
    ELSE '✅ Has Plan'
  END as status
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE p.is_subscription = true
ORDER BY p.name, pv.weight;
