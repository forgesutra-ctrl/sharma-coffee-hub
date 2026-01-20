-- Add variant_amount column to user_subscriptions for tracking actual charged amount
-- This allows us to track the variant price even if variant prices change later

ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS variant_amount numeric(10, 2);

-- Add comment for documentation
COMMENT ON COLUMN user_subscriptions.variant_amount IS 'Amount charged for this variant in rupees (stored for historical tracking)';

-- Create index for queries filtering by variant amount
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_variant_amount 
ON user_subscriptions(variant_amount) 
WHERE variant_amount IS NOT NULL;
