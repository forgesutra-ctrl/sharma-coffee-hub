
-- Remove grind_types column from product_variants table
ALTER TABLE public.product_variants DROP COLUMN IF EXISTS grind_types;

-- Remove grind_type column from order_items table
ALTER TABLE public.order_items DROP COLUMN IF EXISTS grind_type;

-- Remove grind_type column from subscriptions table  
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS grind_type;
