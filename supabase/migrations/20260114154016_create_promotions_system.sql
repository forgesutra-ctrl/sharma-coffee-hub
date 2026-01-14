/*
  # Promotions and Offers System

  1. New Tables
    - `promotions`
      - `id` (uuid, primary key)
      - `name` (text) - e.g., "Summer Sale"
      - `description` (text)
      - `discount_type` (enum: 'percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')
      - `discount_value` (decimal)
      - `coupon_code` (text, unique, nullable)
      - `min_order_amount` (decimal, nullable)
      - `max_discount_amount` (decimal, nullable)
      - `applicable_products` (uuid[], nullable)
      - `applicable_categories` (uuid[], nullable)
      - `start_date` (timestamp)
      - `end_date` (timestamp)
      - `usage_limit` (integer, nullable)
      - `usage_count` (integer, default 0)
      - `is_active` (boolean)
      - `created_at`, `updated_at` (timestamps)
    
    - `promotion_usage`
      - `id` (uuid, primary key)
      - `promotion_id` (uuid, references promotions)
      - `user_id` (uuid, references auth.users)
      - `order_id` (uuid, references orders)
      - `discount_applied` (decimal)
      - `used_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Only super_admin can manage promotions
    - Public can view active promotions
    - Users can view their own promotion usage
*/

-- Create enum for discount types
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type discount_type NOT NULL,
  discount_value decimal NOT NULL,
  coupon_code text UNIQUE,
  min_order_amount decimal DEFAULT 0,
  max_discount_amount decimal,
  applicable_products uuid[],
  applicable_categories uuid[],
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Create promotion_usage table
CREATE TABLE IF NOT EXISTS promotion_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid REFERENCES promotions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  discount_applied decimal NOT NULL,
  used_at timestamptz DEFAULT now()
);

ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for promotions
CREATE POLICY "Anyone can view active promotions"
  ON promotions FOR SELECT
  USING (
    is_active = true 
    AND start_date <= now() 
    AND (end_date IS NULL OR end_date >= now())
  );

CREATE POLICY "Super admins can manage promotions"
  ON promotions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- RLS Policies for promotion_usage
CREATE POLICY "Users can view own promotion usage"
  ON promotion_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view all promotion usage"
  ON promotion_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin', 'staff')
    )
  );

CREATE POLICY "System can create promotion usage"
  ON promotion_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create updated_at trigger for promotions
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS promotions_updated_at ON promotions;
  CREATE TRIGGER promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW
    EXECUTE FUNCTION update_promotions_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create function to validate and apply promotion
CREATE OR REPLACE FUNCTION apply_promotion(
  p_promotion_id uuid,
  p_order_total decimal,
  p_user_id uuid DEFAULT NULL,
  p_product_ids uuid[] DEFAULT NULL,
  p_category_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  is_valid boolean,
  discount_amount decimal,
  error_message text
) AS $$
DECLARE
  v_promotion promotions;
  v_calculated_discount decimal;
BEGIN
  SELECT * INTO v_promotion
  FROM promotions
  WHERE id = p_promotion_id
  AND is_active = true
  AND start_date <= now()
  AND (end_date IS NULL OR end_date >= now());

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::decimal, 'Promotion not found or expired'::text;
    RETURN;
  END IF;

  IF v_promotion.usage_limit IS NOT NULL AND v_promotion.usage_count >= v_promotion.usage_limit THEN
    RETURN QUERY SELECT false, 0::decimal, 'Promotion usage limit reached'::text;
    RETURN;
  END IF;

  IF v_promotion.min_order_amount > 0 AND p_order_total < v_promotion.min_order_amount THEN
    RETURN QUERY SELECT false, 0::decimal, format('Minimum order amount is ₹%s', v_promotion.min_order_amount)::text;
    RETURN;
  END IF;

  IF v_promotion.discount_type = 'percentage' THEN
    v_calculated_discount := (p_order_total * v_promotion.discount_value / 100);
    IF v_promotion.max_discount_amount IS NOT NULL THEN
      v_calculated_discount := LEAST(v_calculated_discount, v_promotion.max_discount_amount);
    END IF;
  ELSIF v_promotion.discount_type = 'fixed_amount' THEN
    v_calculated_discount := LEAST(v_promotion.discount_value, p_order_total);
  ELSIF v_promotion.discount_type = 'free_shipping' THEN
    v_calculated_discount := 0;
  ELSE
    v_calculated_discount := 0;
  END IF;

  RETURN QUERY SELECT true, v_calculated_discount, NULL::text;
END;
$$ LANGUAGE plpgsql;
