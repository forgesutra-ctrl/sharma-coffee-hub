# Deploy Subscription Restriction Migration

## Issue
The Supabase SQL Editor has trouble parsing `DO $$` blocks. Use the simple version instead.

---

## Recommended: Use Simple Version

**File:** `supabase/migrations/20260125000002_restrict_subscription_to_coffee_powders_simple.sql`

### Step-by-Step Instructions

#### Step 1: Find Coffee Powders Category ID
Run this query in Supabase SQL Editor:

```sql
SELECT id, name, slug 
FROM categories
WHERE slug = 'coffee-powders'
   OR LOWER(name) LIKE '%coffee powder%'
   OR LOWER(name) = 'coffee powders'
LIMIT 1;
```

**Note the UUID** from the result (you'll need it for Step 2).

---

#### Step 2: Preview What Will Be Updated
Run this query to see which products will be affected:

```sql
SELECT 
  p.id,
  p.name,
  p.subscription_eligible,
  c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.subscription_eligible = true
  AND (p.category_id IS NULL OR p.category_id != (
    SELECT id FROM categories 
    WHERE slug = 'coffee-powders'
       OR LOWER(name) LIKE '%coffee powder%'
       OR LOWER(name) = 'coffee powders'
    LIMIT 1
  ));
```

---

#### Step 3: Update Products
Run this UPDATE statement (it uses a subquery, so no manual UUID needed):

```sql
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
```

---

#### Step 4: Create Validation Function
Run this entire block:

```sql
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
```

---

#### Step 5: Create Trigger
Run these two statements:

```sql
DROP TRIGGER IF EXISTS validate_subscription_eligibility_trigger ON public.products;

CREATE TRIGGER validate_subscription_eligibility_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subscription_eligibility();
```

---

#### Step 6: Verify
Run this verification query:

```sql
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
```

All results should show "✅ Valid".

---

## Alternative: Use Split Version

If you prefer, you can use `supabase/migrations/20260125000002_restrict_subscription_to_coffee_powders_split.sql` which has more detailed instructions.

---

## What This Does

1. ✅ Removes `subscription_eligible = true` from all products NOT in Coffee Powders category
2. ✅ Creates a validation function that prevents setting `subscription_eligible = true` for non-Coffee Powder products
3. ✅ Creates a trigger that enforces the validation automatically
4. ✅ Provides verification queries to check the results

---

## After Deployment

1. ✅ Test: Try to set `subscription_eligible = true` on a non-Coffee Powder product → Should fail
2. ✅ Verify: Only Coffee Powder products have `subscription_eligible = true`
3. ✅ Frontend: Subscription option should only appear for Coffee Powder products with 1000g variants

---

## Troubleshooting

**Error: "unterminated dollar-quoted string"**
- Use the simple version (`_simple.sql`) instead of the main file
- Run each section separately

**Error: "Coffee Powders category not found"**
- Check if the category exists: `SELECT * FROM categories WHERE slug = 'coffee-powders';`
- If it doesn't exist, create it first or adjust the WHERE clause in the queries

**No products updated**
- This is fine if all your subscription-eligible products are already in the Coffee Powders category
- Run the verification query to confirm
