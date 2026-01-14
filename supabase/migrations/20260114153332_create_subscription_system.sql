/*
  # Coffee Subscription System

  1. New Tables
    - `subscription_plans`
      - `id` (uuid, primary key)
      - `name` (text) - e.g., "Monthly Coffee Subscription"
      - `description` (text)
      - `billing_cycle` (text) - 'monthly'
      - `discount_percentage` (integer) - discount for subscribers
      - `is_active` (boolean)
      - `created_at`, `updated_at` (timestamps)
    
    - `user_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `plan_id` (uuid, references subscription_plans)
      - `product_id` (uuid, references products)
      - `variant_id` (uuid, references product_variants)
      - `quantity` (integer)
      - `status` (enum: 'active', 'paused', 'cancelled')
      - `next_billing_date` (date)
      - `shipping_address` (jsonb)
      - `razorpay_subscription_id` (text)
      - `created_at`, `updated_at` (timestamps)
    
    - `subscription_orders`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, references user_subscriptions)
      - `order_id` (uuid, references orders)
      - `billing_date` (date)
      - `status` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can view their own subscriptions
    - Only authenticated users can create subscriptions
    - Super admins can manage all subscriptions
*/

-- Create enum for subscription status
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  discount_percentage integer NOT NULL DEFAULT 10,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  status subscription_status DEFAULT 'active',
  next_billing_date date NOT NULL,
  shipping_address jsonb,
  razorpay_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create subscription_orders table
CREATE TABLE IF NOT EXISTS subscription_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  billing_date date NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can manage subscription plans"
  ON subscription_plans FOR ALL
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

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can view all subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin', 'staff')
    )
  );

-- RLS Policies for subscription_orders
CREATE POLICY "Users can view own subscription orders"
  ON subscription_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_subscriptions.id = subscription_orders.subscription_id
      AND user_subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all subscription orders"
  ON subscription_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin', 'staff')
    )
  );

CREATE POLICY "System can create subscription orders"
  ON subscription_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create updated_at trigger for subscription_plans
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS subscription_plans_updated_at ON subscription_plans;
  CREATE TRIGGER subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_plans_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create updated_at trigger for user_subscriptions
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON user_subscriptions;
  CREATE TRIGGER user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_subscriptions_updated_at();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Insert default subscription plan
INSERT INTO subscription_plans (name, description, billing_cycle, discount_percentage, is_active)
VALUES (
  'Monthly Coffee Subscription',
  'Get your favorite coffee delivered every month with 10% discount',
  'monthly',
  10,
  true
)
ON CONFLICT DO NOTHING;