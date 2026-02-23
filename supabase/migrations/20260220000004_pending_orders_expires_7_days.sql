-- Change pending_orders expires_at from 30 minutes to 7 days
-- Gives customers more time to complete one-time order payment (matches pending_subscriptions)

ALTER TABLE pending_orders
  ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '7 days';

COMMENT ON COLUMN pending_orders.expires_at IS 'Order expires 7 days after creation if payment not completed';
