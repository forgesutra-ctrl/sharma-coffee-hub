-- Add failed_at column to webhook_queue for permanently failed items
-- When retry_count >= max_retries, we set failed_at instead of deleting

ALTER TABLE webhook_queue
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_webhook_queue_failed_at
ON webhook_queue(failed_at)
WHERE failed_at IS NOT NULL;

COMMENT ON COLUMN webhook_queue.failed_at IS 'Set when retry_count >= max_retries; row is permanently failed';
