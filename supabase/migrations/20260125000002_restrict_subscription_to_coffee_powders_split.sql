-- ============================================================================
-- RESTRICT SUBSCRIPTIONS TO COFFEE POWDERS ONLY (SPLIT VERSION)
-- ============================================================================
-- Run each section separately in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- SECTION 1: Update existing products
-- ============================================================================
-- Run this section first to remove subscription_eligible from non-Coffee Powder products
-- ============================================================================

-- Step 1.1: Find Coffee Powders category ID
-- Run this query first to get the category ID
SELECT id, name, slug 
FROM categories
WHERE slug = 'coffee-powders'
   OR LOWER(name) LIKE '%coffee powder%'
   OR LOWER(name) = 'coffee powders'
LIMIT 1;

-- Step 1.2: Update products (replace 'YOUR_CATEGORY_ID' with the ID from Step 1.1)
-- Replace the UUID below with the actual category ID from Step 1.1
UPDATE products
SET subscription_eligible = false
WHERE subscription_eligible = true
  AND (category_id IS NULL OR category_id != 'YOUR_CATEGORY_ID_HERE'::uuid);

-- Step 1.3: Verify update (check how many products were updated)
SELECT 
  COUNT(*) as updated_count,
  'Products with subscription_eligible removed' as description
FROM products
WHERE subscription_eligible = false
  AND category_id IS NOT NULL
  AND category_id != (SELECT id FROM categories WHERE slug = 'coffee-powders' LIMIT 1);

-- ============================================================================
-- SECTION 2: Create validation function
-- ============================================================================
-- Run this section to create the validation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_subscription_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn1$
DECLARE
  coffee_powders_category_id UUID;
  is_coffee_powder BOOLEAN;
BEGIN
  IF NEW.subscription_eligible = true THEN
    SELECT id INTO coffee_powders_category_id
    FROM categories
    WHERE slug = 'coffee-powders'
       OR LOWER(name) LIKE '%coffee powder%'
       OR LOWER(name) = 'coffee powders'
    LIMIT 1;

    IF coffee_powders_category_id IS NOT NULL THEN
      is_coffee_powder := (NEW.category_id = coffee_powders_category_id);
    ELSE
      SELECT EXISTS (
        SELECT 1 FROM categories
        WHERE id = NEW.category_id
        AND (LOWER(name) LIKE '%coffee powder%' OR LOWER(name) = 'coffee powders')
      ) INTO is_coffee_powder;
    END IF;

    IF NOT is_coffee_powder THEN
      RAISE EXCEPTION 'subscription_eligible can only be set to true for products in the Coffee Powders category. Product category_id: %, Coffee Powders category_id: %', 
        NEW.category_id, coffee_powders_category_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$fn1$;

-- ============================================================================
-- SECTION 3: Create trigger
-- ============================================================================
-- Run this section to create the validation trigger
-- ============================================================================

DROP TRIGGER IF EXISTS validate_subscription_eligibility_trigger ON public.products;

CREATE TRIGGER validate_subscription_eligibility_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subscription_eligibility();

-- ============================================================================
-- SECTION 4: Verification queries
-- ============================================================================
-- Run these queries to verify the migration worked correctly
-- ============================================================================

-- Check which products have subscription_eligible = true
SELECT 
  p.id,
  p.name,
  p.subscription_eligible,
  c.name as category_name,
  c.slug as category_slug,
  CASE 
    WHEN c.slug = 'coffee-powders' OR LOWER(c.name) LIKE '%coffee powder%' THEN '✅ Valid'
    ELSE '❌ Invalid - Not Coffee Powder'
  END as validation_status
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.subscription_eligible = true
ORDER BY validation_status, p.name;

-- Count products by category with subscription eligibility
SELECT 
  c.name as category_name,
  COUNT(*) as product_count,
  COUNT(CASE WHEN p.subscription_eligible = true THEN 1 END) as subscription_eligible_count
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
GROUP BY c.name
ORDER BY subscription_eligible_count DESC, c.name;
