-- Change pending_subscriptions expires_at from 1 hour to 7 days
-- Gives customers more time to complete subscription payment

ALTER TABLE pending_subscriptions
  ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '7 days';

COMMENT ON COLUMN pending_subscriptions.expires_at IS 'Subscription expires 7 days after creation if payment not completed';
