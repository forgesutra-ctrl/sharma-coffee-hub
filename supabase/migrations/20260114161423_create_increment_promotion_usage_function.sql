/*
  # Create Promotion Usage Increment Function

  1. New Functions
    - `increment_promotion_usage` - Safely increments the usage count for a promotion
  
  2. Security
    - Function is SECURITY DEFINER to allow service role to update
    - Validates promotion exists and is active
*/

CREATE OR REPLACE FUNCTION increment_promotion_usage(promotion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE promotions
  SET usage_count = usage_count + 1
  WHERE id = promotion_id
  AND is_active = true;
END;
$$;
