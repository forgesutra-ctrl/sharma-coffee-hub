-- Create pending_orders table for one-time payments
-- Temporary storage before payment confirmation via webhook

CREATE TABLE IF NOT EXISTS pending_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_data JSONB NOT NULL, -- Full cart items data
  shipping_address JSONB NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('prepaid', 'cod')),
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_charge DECIMAL(10,2) DEFAULT 0,
  cod_handling_fee DECIMAL(10,2) DEFAULT 0,
  cod_advance_paid DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_orders_razorpay_id 
ON pending_orders(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_pending_orders_user_id 
ON pending_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_pending_orders_expires_at 
ON pending_orders(expires_at);

-- Enable RLS
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own pending orders"
ON pending_orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create pending orders"
ON pending_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for webhook)
CREATE POLICY "Service role full access to pending orders"
ON pending_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE pending_orders IS 'Temporary storage for one-time orders before payment is confirmed via webhook. Data is moved to orders table after successful payment.';
