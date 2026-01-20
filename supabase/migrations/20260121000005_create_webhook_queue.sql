-- Create webhook_queue table for retry logic
-- Handles failed webhook processing with exponential backoff

CREATE TABLE IF NOT EXISTS webhook_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_queue_event_type 
ON webhook_queue(event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_next_retry_at 
ON webhook_queue(next_retry_at) 
WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_queue_processed 
ON webhook_queue(processed_at) 
WHERE processed_at IS NULL;

-- Enable RLS (only service role can access)
ALTER TABLE webhook_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access webhook queue
CREATE POLICY "Service role full access to webhook queue"
ON webhook_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE webhook_queue IS 'Queue for retrying failed webhook processing with exponential backoff.';
