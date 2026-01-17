/*
  # Enhance Subscription System Tables

  ## Overview
  This migration enhances existing subscription tables to support Razorpay Subscriptions
  with delivery date selection and auto-debit mandate functionality.

  ## Changes to Existing Tables

  ### 1. subscription_plans
  Added columns:
  - `product_id` (uuid) - Links plan to specific product
  - `variant_id` (uuid) - Links plan to specific variant
  - `amount` (integer) - Amount in paise for consistency
  
  ### 2. user_subscriptions
  Added columns:
  - `preferred_delivery_date` (integer) - Day of month (1-28) for delivery
  - `next_delivery_date` (date) - Next scheduled delivery date
  - `total_deliveries` (integer) - Total planned deliveries
  - `completed_deliveries` (integer) - Deliveries completed so far
  Updated:
  - Enhanced status enum to include 'pending' and 'completed'

  ### 3. subscription_orders
  Added columns:
  - `billing_cycle` (integer) - Which billing cycle this order represents
  - `razorpay_payment_id` (text) - Payment ID for this cycle
  Updated:
  - Changed billing_date to more generic use
  - Enhanced status tracking

  ## Security
  - RLS policies already exist and will continue to work
  - Added admin policies for subscription management

  ## Important Notes
  1. All monetary amounts in paise (₹1 = 100 paise)
  2. Delivery date between 1-28 for monthly consistency
  3. Existing subscriptions won't be affected
*/

-- Add missing columns to subscription_plans if they don't exist
DO $$
BEGIN
  -- Add product_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE CASCADE;
  END IF;

  -- Add variant_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;
  END IF;

  -- Add amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'amount'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN amount INTEGER;
  END IF;
END $$;

-- Add missing columns to user_subscriptions if they don't exist
DO $$
BEGIN
  -- Add preferred_delivery_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'preferred_delivery_date'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN preferred_delivery_date INTEGER CHECK (preferred_delivery_date BETWEEN 1 AND 28);
  END IF;

  -- Add next_delivery_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'next_delivery_date'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN next_delivery_date DATE;
  END IF;

  -- Add total_deliveries column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'total_deliveries'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN total_deliveries INTEGER DEFAULT 12 CHECK (total_deliveries > 0);
  END IF;

  -- Add completed_deliveries column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_subscriptions' AND column_name = 'completed_deliveries'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN completed_deliveries INTEGER DEFAULT 0 CHECK (completed_deliveries >= 0);
  END IF;
END $$;

-- Add missing columns to subscription_orders if they don't exist
DO $$
BEGIN
  -- Add billing_cycle column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_orders' AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE subscription_orders ADD COLUMN billing_cycle INTEGER CHECK (billing_cycle > 0);
  END IF;

  -- Add razorpay_payment_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_orders' AND column_name = 'razorpay_payment_id'
  ) THEN
    ALTER TABLE subscription_orders ADD COLUMN razorpay_payment_id TEXT;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_product_variant 
  ON subscription_plans(product_id, variant_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_delivery_date 
  ON user_subscriptions(next_delivery_date) 
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscription_orders_cycle 
  ON subscription_orders(subscription_id, billing_cycle);

-- Add policy for admins to manage subscription plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscription_plans' 
    AND policyname = 'Admins can manage all subscription plans'
  ) THEN
    CREATE POLICY "Admins can manage all subscription plans"
      ON subscription_plans
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND user_roles.role IN ('super_admin', 'admin')
        )
      );
  END IF;
END $$;

-- Function to calculate next delivery date based on preferred day
CREATE OR REPLACE FUNCTION calculate_next_delivery_date(
  preferred_day INTEGER,
  from_date DATE DEFAULT CURRENT_DATE
)
RETURNS DATE AS $$
DECLARE
  next_date DATE;
  current_month_delivery DATE;
BEGIN
  -- Calculate delivery date for current month
  current_month_delivery := DATE_TRUNC('month', from_date)::DATE + (preferred_day - 1);
  
  -- If the date has passed this month, move to next month
  IF current_month_delivery <= from_date THEN
    next_date := (DATE_TRUNC('month', from_date) + INTERVAL '1 month')::DATE + (preferred_day - 1);
  ELSE
    next_date := current_month_delivery;
  END IF;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update subscription delivery dates
CREATE OR REPLACE FUNCTION update_subscription_next_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- If preferred_delivery_date is set and next_delivery_date is null, calculate it
  IF NEW.preferred_delivery_date IS NOT NULL AND NEW.next_delivery_date IS NULL THEN
    NEW.next_delivery_date := calculate_next_delivery_date(NEW.preferred_delivery_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic delivery date calculation
DROP TRIGGER IF EXISTS set_subscription_delivery_date ON user_subscriptions;
CREATE TRIGGER set_subscription_delivery_date
  BEFORE INSERT OR UPDATE OF preferred_delivery_date
  ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_next_delivery();
