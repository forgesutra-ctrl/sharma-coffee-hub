-- ============================================================================
-- RESTRICT SUBSCRIPTIONS TO COFFEE POWDERS ONLY (SIMPLE VERSION)
-- ============================================================================
-- This version uses a simpler approach without DO blocks
-- Run each statement separately in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Find Coffee Powders category ID
-- ============================================================================
-- Run this first and note the ID
SELECT id, name, slug 
FROM categories
WHERE slug = 'coffee-powders'
   OR LOWER(name) LIKE '%coffee powder%'
   OR LOWER(name) = 'coffee powders'
LIMIT 1;

-- ============================================================================
-- STEP 2: Update products (MANUAL - Replace UUID below)
-- ============================================================================
-- Replace '00000000-0000-0000-0000-000000000000' with the actual category ID from Step 1
-- ============================================================================

-- First, let's see what will be updated:
SELECT 
  p.id,
  p.name,
  p.subscription_eligible,
  c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.subscription_eligible = true
  AND (p.category_id IS NULL OR p.category_id != '00000000-0000-0000-0000-000000000000'::uuid);

-- Now update (replace the UUID):
UPDATE products
SET subscription_eligible = false
WHERE subscription_eligible = true
  AND (category_id IS NULL OR category_id != '00000000-0000-0000-0000-000000000000'::uuid);

-- ============================================================================
-- STEP 3: Create validation function
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
      RAISE EXCEPTION 'subscription_eligible can only be set to true for products in the Coffee Powders category';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn1$;

-- ============================================================================
-- STEP 4: Create trigger
-- ============================================================================

DROP TRIGGER IF EXISTS validate_subscription_eligibility_trigger ON public.products;

CREATE TRIGGER validate_subscription_eligibility_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subscription_eligibility();

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

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
