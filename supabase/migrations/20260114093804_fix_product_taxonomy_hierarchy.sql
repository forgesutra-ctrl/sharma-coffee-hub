/*
  # Fix Product Taxonomy and Category Hierarchy
  
  ## Summary
  This migration fixes the incorrect product taxonomy where product families
  (Coorg Classic, Gold Blend, Premium Blend, etc.) were set up as sub-categories
  instead of as parent products with variants.
  
  ## Changes Made
  
  ### 1. Add Parent-Child Relationship to Products
  - Add `parent_product_id` column to products table
  - Products with parent_product_id = NULL are main products (shown in shop)
  - Products with parent_product_id set are variants (shown on product detail page)
  
  ### 2. Restructure Product Relationships
  
  **Coffee Powders Products:**
  - Coorg Classic (parent) → Coorg Classic (only variant)
  - Gold Blend (parent) → Balanced Strong, Extra Coffee Forward, Strong Classic
  - Premium Blend (parent) → Coffee Dominant, Perfect Balance, Rich & Smooth  
  - Speciality Blend (parent) → Mild & Aromatic, Pure Coffee Feel, Refined Strength
  - Royal Caffeine (parent) → 100% Arabica, 100% Robusta, 50-50 blend
  - Hotel Blend (parent) → Hotel Blend (only variant)
  
  ### 3. Update Category Assignments
  - All coffee powder products now link directly to Coffee Powders category
  - Remove sub-categories: Coorg Classic, Gold Blend, Premium Blend, Speciality Blend, Royal Caffeine, Hotel Blend
  
  ### 4. Data Safety
  - No data is deleted
  - All products are preserved
  - Category structure is simplified
  - Parent-child relationships are established
  
  ## Important Notes
  - Shop page will now only show parent products under Coffee Powders
  - Product detail page will show variants for products with children
  - This creates a proper retail catalog structure
*/

-- Step 1: Add parent_product_id column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'parent_product_id'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN parent_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_products_parent 
    ON public.products(parent_product_id);
  END IF;
END $$;

-- Step 2: Get the Coffee Powders category ID (we'll use it repeatedly)
DO $$
DECLARE
  coffee_powders_id UUID;
  coorg_parent_id UUID;
  gold_parent_id UUID;
  premium_parent_id UUID;
  speciality_parent_id UUID;
  royal_parent_id UUID;
  hotel_parent_id UUID;
BEGIN
  -- Get Coffee Powders category ID
  SELECT id INTO coffee_powders_id FROM categories WHERE slug = 'coffee-powders';
  
  -- === COORG CLASSIC ===
  -- Get parent product ID
  SELECT id INTO coorg_parent_id FROM products WHERE slug = 'coorg-classic';
  
  -- Update Coorg Classic parent to link to Coffee Powders
  UPDATE products 
  SET category_id = coffee_powders_id, parent_product_id = NULL
  WHERE id = coorg_parent_id;
  
  -- No variants for Coorg Classic (it only has itself)
  
  -- === GOLD BLEND ===
  -- Get parent product ID
  SELECT id INTO gold_parent_id FROM products WHERE slug = 'gold-blend';
  
  -- Update Gold Blend parent to link to Coffee Powders
  UPDATE products 
  SET category_id = coffee_powders_id, parent_product_id = NULL
  WHERE id = gold_parent_id;
  
  -- Set variants to be children of Gold Blend
  UPDATE products 
  SET category_id = coffee_powders_id, parent_product_id = gold_parent_id
  WHERE slug IN (
    'gold-blend-balanced-strong',
    'gold-blend-extra-coffee-forward',
    'gold-blend-strong-classic'
  );
  
  -- === PREMIUM BLEND ===
  -- Get parent product ID
  SELECT id INTO premium_parent_id FROM products WHERE slug = 'premium-blend';
  
  -- Update Premium Blend parent to link to Coffee Powders
  UPDATE products 
  SET category_id = coffee_powders_id, parent_product_id = NULL
  WHERE id = premium_parent_id;
  
  -- Set variants to be children of Premium Blend
  UPDATE products 
  SET category_id = coffee_powders_id, parent_product_id = premium_parent_id
  WHERE slug IN (
    'premium-blend-coffee-dominant',
    'premium-blend-perfect-balance',
    'premium-blend-rich-smooth'
  );
  
  -- === SPECIALITY BLEND ===
  -- Get parent product ID
  SELECT id INTO speciality_parent_id FROM products WHERE slug = 'speciality-blend';
  
  -- Update Speciality Blend parent to link to Coffee Powders
  UPDATE products 
  SET category_id = coffee_powders_id, parent_product_id = NULL
  WHERE id = speciality_parent_id;
  
  -- Set variants to be children of Speciality Blend
  UPDATE products 
  SET category_id = coffee_powders_id, parent_product_id = speciality_parent_id
  WHERE slug IN (
    'speciality-blend-mild-aromatic',
    'speciality-blend-pure-coffee-feel',
    'speciality-blend-refined-strength'
  );
  
  -- === ROYAL CAFFEINE ===
  -- Get parent product ID
  SELECT id INTO royal_parent_id FROM products WHERE slug = 'royal-caffeine';
  
  -- Update Royal Caffeine parent to link to Coffee Powders
  UPDATE products 
  SET category_id = coffee_powders_id, parent_product_id = NULL
  WHERE id = royal_parent_id;
  
  -- Set variants to be children of Royal Caffeine
  UPDATE products 
  SET category_id = coffee_powders_id, parent_product_id = royal_parent_id
  WHERE slug IN (
    'royal-caffeine-100-arabica',
    'royal-caffeine-100-robusta',
    'royal-caffeine-50-50'
  );
  
  -- === HOTEL BLEND ===
  -- Get parent product ID
  SELECT id INTO hotel_parent_id FROM products WHERE slug = 'hotel-blend';
  
  -- Update Hotel Blend parent to link to Coffee Powders
  UPDATE products 
  SET category_id = coffee_powders_id, parent_product_id = NULL
  WHERE id = hotel_parent_id;
  
  -- No variants for Hotel Blend (it only has itself)
  
  -- === OTHER PRODUCTS ===
  -- Update standalone products that were pointing to Coffee Powders directly
  UPDATE products 
  SET parent_product_id = NULL
  WHERE slug IN (
    'coorg-classic-blend',
    'gold-blend-premium',
    'premium-blend-arabica'
  ) AND category_id = coffee_powders_id;
  
END $$;

-- Step 3: Mark sub-categories as inactive (we keep them for data integrity but hide them)
UPDATE categories 
SET is_active = false
WHERE slug IN (
  'coorg-classic',
  'gold-blend',
  'premium-blend',
  'speciality-blend',
  'royal-caffeine',
  'hotel-blend'
) AND parent_id IS NOT NULL;

-- Step 4: Add comment to explain the structure
COMMENT ON COLUMN products.parent_product_id IS 'NULL for main products shown in shop, set to parent product ID for variants shown on product detail page';
