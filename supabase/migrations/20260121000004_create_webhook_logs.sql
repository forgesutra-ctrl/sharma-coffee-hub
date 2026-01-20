-- Create webhook_logs table for tracking all webhook events
-- Used for admin review and debugging

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  razorpay_event_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type 
ON webhook_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_razorpay_event_id 
ON webhook_logs(razorpay_event_id) 
WHERE razorpay_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed 
ON webhook_logs(processed);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at 
ON webhook_logs(created_at DESC);

-- Enable RLS (only service role can access)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access webhook logs
CREATE POLICY "Service role full access to webhook logs"
ON webhook_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE webhook_logs IS 'Logs all Razorpay webhook events for admin review and debugging.';
