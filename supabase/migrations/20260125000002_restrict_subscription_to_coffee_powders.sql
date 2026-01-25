-- ============================================================================
-- RESTRICT SUBSCRIPTIONS TO COFFEE POWDERS ONLY
-- ============================================================================
-- This migration ensures that:
-- 1. Only products in "Coffee Powders" category can have subscription_eligible = true
-- 2. Updates any existing products that have subscription_eligible = true but are not in Coffee Powders
-- ============================================================================

-- ============================================================================
-- STEP 1: Find Coffee Powders category ID
-- ============================================================================
-- Run this query first to get the category ID, then use it in Step 2
-- ============================================================================

-- Query to find Coffee Powders category (run this first):
-- SELECT id, name, slug 
-- FROM categories
-- WHERE slug = 'coffee-powders'
--    OR LOWER(name) LIKE '%coffee powder%'
--    OR LOWER(name) = 'coffee powders'
-- LIMIT 1;

-- ============================================================================
-- STEP 2: Update products (run after getting category ID from Step 1)
-- ============================================================================
-- Replace 'YOUR_CATEGORY_ID_HERE' with the actual UUID from Step 1
-- ============================================================================

-- First, preview what will be updated:
-- SELECT 
--   p.id,
--   p.name,
--   p.subscription_eligible,
--   c.name as category_name
-- FROM products p
-- LEFT JOIN categories c ON p.category_id = c.id
-- WHERE p.subscription_eligible = true
--   AND (p.category_id IS NULL OR p.category_id != 'YOUR_CATEGORY_ID_HERE'::uuid);

-- Then update (uncomment and replace UUID):
-- UPDATE products
-- SET subscription_eligible = false
-- WHERE subscription_eligible = true
--   AND (category_id IS NULL OR category_id != 'YOUR_CATEGORY_ID_HERE'::uuid);

-- Alternative: Update using subquery (no manual UUID needed):
UPDATE products
SET subscription_eligible = false
WHERE subscription_eligible = true
  AND (category_id IS NULL OR category_id != (
    SELECT id FROM categories 
    WHERE slug = 'coffee-powders'
       OR LOWER(name) LIKE '%coffee powder%'
       OR LOWER(name) = 'coffee powders'
    LIMIT 1
  ));

-- ============================================================================
-- CREATE FUNCTION TO VALIDATE SUBSCRIPTION ELIGIBILITY
-- ============================================================================
-- This function can be used in triggers or application code to ensure
-- subscription_eligible is only set for Coffee Powder products
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
  -- If subscription_eligible is being set to true, validate category
  IF NEW.subscription_eligible = true THEN
    -- Get Coffee Powders category ID
    SELECT id INTO coffee_powders_category_id
    FROM categories
    WHERE slug = 'coffee-powders'
       OR LOWER(name) LIKE '%coffee powder%'
       OR LOWER(name) = 'coffee powders'
    LIMIT 1;

    -- Check if product is in Coffee Powders category
    IF coffee_powders_category_id IS NOT NULL THEN
      is_coffee_powder := (NEW.category_id = coffee_powders_category_id);
    ELSE
      -- If category not found, check by category name (fallback)
      SELECT EXISTS (
        SELECT 1 FROM categories
        WHERE id = NEW.category_id
        AND (LOWER(name) LIKE '%coffee powder%' OR LOWER(name) = 'coffee powders')
      ) INTO is_coffee_powder;
    END IF;

    -- If not in Coffee Powders category, prevent setting subscription_eligible = true
    IF NOT is_coffee_powder THEN
      RAISE EXCEPTION 'subscription_eligible can only be set to true for products in the Coffee Powders category. Product category_id: %, Coffee Powders category_id: %', 
        NEW.category_id, coffee_powders_category_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$fn1$;

-- Create trigger to enforce subscription eligibility validation
DROP TRIGGER IF EXISTS validate_subscription_eligibility_trigger ON public.products;
CREATE TRIGGER validate_subscription_eligibility_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subscription_eligibility();

-- ============================================================================
-- VERIFICATION QUERIES
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
