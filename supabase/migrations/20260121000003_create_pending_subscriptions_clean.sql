-- Create pending_subscriptions table for subscription payments
-- Temporary storage before payment confirmation via webhook
-- NOTE: This replaces the previous pending_subscriptions table structure

DROP TABLE IF EXISTS pending_subscriptions CASCADE;

CREATE TABLE pending_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_subscription_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  preferred_delivery_date INTEGER NOT NULL CHECK (preferred_delivery_date >= 1 AND preferred_delivery_date <= 28),
  total_deliveries INTEGER NOT NULL DEFAULT 12,
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour'
);

-- Indexes for performance
CREATE INDEX idx_pending_subscriptions_razorpay_id 
ON pending_subscriptions(razorpay_subscription_id);

CREATE INDEX idx_pending_subscriptions_user_id 
ON pending_subscriptions(user_id);

CREATE INDEX idx_pending_subscriptions_expires_at 
ON pending_subscriptions(expires_at);

-- Enable RLS
ALTER TABLE pending_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own pending subscriptions"
ON pending_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create pending subscriptions"
ON pending_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for webhook)
CREATE POLICY "Service role full access to pending subscriptions"
ON pending_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE pending_subscriptions IS 'Temporary storage for subscription data before payment is confirmed via webhook. Data is moved to user_subscriptions after successful payment.';
