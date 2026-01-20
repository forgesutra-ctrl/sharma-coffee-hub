-- Create subscription_deliveries table to manage delivery scheduling
-- independently from Razorpay billing cycles.

CREATE TABLE IF NOT EXISTS subscription_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  cycle_number INTEGER NOT NULL,
  delivery_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | delivered | skipped
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_subscription_id
  ON subscription_deliveries(subscription_id);

COMMENT ON TABLE subscription_deliveries IS
  'Application-level delivery schedule for subscriptions. Billing is handled by Razorpay; this table only controls deliveries.';

