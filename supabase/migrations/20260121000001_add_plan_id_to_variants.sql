-- Add razorpay_plan_id to product_variants table
-- This allows each variant to have its own subscription plan

ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_variants_plan_id 
ON product_variants(razorpay_plan_id) 
WHERE razorpay_plan_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN product_variants.razorpay_plan_id IS 'Razorpay subscription plan ID for this variant. Each variant size can have its own monthly subscription plan.';
