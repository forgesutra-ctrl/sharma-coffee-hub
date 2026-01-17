/*
  # Fix Function Search Paths for Security

  ## Overview
  Sets explicit search_path for functions to prevent search_path manipulation attacks.
  This ensures functions always resolve schema-qualified names correctly.

  ## Functions Updated
  1. calculate_next_delivery_date
  2. update_subscription_next_delivery
  3. decrement_variant_stock

  ## Security Impact
  - Prevents search_path injection attacks
  - Ensures functions operate on the correct schema
  - Follows PostgreSQL security best practices
*/

-- ============================================================================
-- calculate_next_delivery_date Function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_delivery_date(
  p_current_date date,
  p_preferred_day integer
)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_date date;
  current_day integer;
BEGIN
  -- Get the day of the month from current date
  current_day := EXTRACT(DAY FROM p_current_date);
  
  -- If we're before the preferred day this month, use this month
  IF current_day < p_preferred_day THEN
    next_date := date_trunc('month', p_current_date)::date + (p_preferred_day - 1);
  ELSE
    -- Otherwise, use next month
    next_date := (date_trunc('month', p_current_date) + INTERVAL '1 month')::date + (p_preferred_day - 1);
  END IF;
  
  -- Handle case where preferred day doesn't exist in the month (e.g., Feb 30)
  -- Move to last day of that month instead
  IF EXTRACT(DAY FROM next_date) != p_preferred_day THEN
    next_date := (date_trunc('month', next_date) + INTERVAL '1 month - 1 day')::date;
  END IF;
  
  RETURN next_date;
END;
$$;

-- ============================================================================
-- update_subscription_next_delivery Function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subscription_next_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- When a subscription order is completed, update the next delivery date
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE user_subscriptions
    SET 
      next_delivery_date = calculate_next_delivery_date(CURRENT_DATE, preferred_delivery_date),
      completed_deliveries = completed_deliveries + 1,
      status = CASE
        WHEN completed_deliveries + 1 >= total_deliveries THEN 'cancelled'::subscription_status
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.subscription_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- decrement_variant_stock Function
-- ============================================================================

CREATE OR REPLACE FUNCTION decrement_variant_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_previous_quantity integer;
  v_new_quantity integer;
BEGIN
  -- Get current stock quantity
  SELECT stock_quantity INTO v_previous_quantity
  FROM product_variants
  WHERE id = NEW.variant_id;
  
  -- Calculate new quantity
  v_new_quantity := v_previous_quantity - NEW.quantity;
  
  -- Update the variant stock
  UPDATE product_variants
  SET stock_quantity = v_new_quantity
  WHERE id = NEW.variant_id;
  
  -- Log the stock change
  INSERT INTO stock_change_logs (
    variant_id,
    product_id,
    previous_quantity,
    new_quantity,
    change_amount,
    reason,
    changed_by
  ) VALUES (
    NEW.variant_id,
    NEW.product_id,
    v_previous_quantity,
    v_new_quantity,
    -NEW.quantity,
    'Order placed',
    (SELECT user_id FROM orders WHERE id = NEW.order_id)
  );
  
  RETURN NEW;
END;
$$;
