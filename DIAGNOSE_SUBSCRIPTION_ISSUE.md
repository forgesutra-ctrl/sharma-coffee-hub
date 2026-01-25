# Diagnose Subscription Issue

## Steps to Diagnose

### Step 1: Run Diagnostic SQL Query

Run this query in Supabase SQL Editor to check your products:

```sql
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
  -- Get 1000g variant plan ID
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
  END as subscription_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true
ORDER BY p.name;
```

### Step 2: Check Browser Console

1. Open your product page in the browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for "🔍 Subscription Eligibility Debug" log
5. Check what values are shown

### Step 3: Check Yellow Debug Box

If the subscription option is not showing, you should see a yellow debug box on the product page showing:
- ✅ or ❌ for each requirement
- This will tell you exactly what's missing

### Step 4: Common Issues and Fixes

#### Issue 1: `subscription_eligible = false`
**Fix:** Update the product in database:
```sql
UPDATE products 
SET subscription_eligible = true 
WHERE slug = 'your-product-slug';
```

#### Issue 2: Product not in Coffee Powders category
**Fix:** Check category assignment:
```sql
-- Find Coffee Powders category
SELECT id, name, slug FROM categories WHERE slug = 'coffee-powders';

-- Update product category (replace UUIDs)
UPDATE products 
SET category_id = 'COFFEE_POWDERS_CATEGORY_ID_HERE'
WHERE slug = 'your-product-slug';
```

#### Issue 3: No 1000g variant
**Fix:** Create 1000g variant:
```sql
INSERT INTO product_variants (product_id, weight, price, stock_quantity)
VALUES ('PRODUCT_ID_HERE', 1000, 840.00, 100);
```

#### Issue 4: Missing razorpay_plan_id
**Fix:** Add plan ID to product or variant:
```sql
-- Option 1: Add to product
UPDATE products 
SET razorpay_plan_id = 'YOUR_RAZORPAY_PLAN_ID'
WHERE slug = 'your-product-slug';

-- Option 2: Add to 1000g variant
UPDATE product_variants 
SET razorpay_plan_id = 'YOUR_RAZORPAY_PLAN_ID'
WHERE product_id = 'PRODUCT_ID_HERE' AND weight = 1000;
```

### Step 5: Quick Fix Script

If you want to quickly enable subscriptions for all Coffee Powder products with 1000g variants:

```sql
-- Step 1: Find Coffee Powders category ID
SELECT id FROM categories WHERE slug = 'coffee-powders' LIMIT 1;

-- Step 2: Enable subscriptions for all Coffee Powder products with 1000g variants
-- (Replace CATEGORY_ID with the ID from Step 1)
UPDATE products p
SET subscription_eligible = true
WHERE p.category_id = 'CATEGORY_ID_HERE'
  AND EXISTS (
    SELECT 1 FROM product_variants pv 
    WHERE pv.product_id = p.id 
    AND pv.weight = 1000
  )
  AND p.is_active = true;
```

---

## What the Debug Log Shows

The debug log will show:
- `subscription_eligible`: Should be `true`
- `category_slug`: Should be `'coffee-powders'`
- `has1000gVariant`: Should be `true`
- `kgVariant.razorpay_plan_id`: Should have a value (or product should have `razorpay_plan_id`)
- `isProductSubscriptionEligible`: Should be `true` for subscription option to show

---

## After Fixing

1. Refresh the product page
2. Check console for updated debug log
3. Yellow debug box should disappear
4. Subscription option should appear
