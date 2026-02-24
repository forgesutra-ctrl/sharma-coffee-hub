-- Cron job: Cancel abandoned orders (pending_payment > 24 hours) daily at 3:00 AM UTC
-- Requires: pg_cron extension (enable in Dashboard if needed)

SELECT cron.schedule(
  'cleanup-pending-payment-orders-daily',
  '0 3 * * *',
  $$
  UPDATE public.orders
  SET status = 'cancelled'
  WHERE status = 'pending_payment'
    AND created_at < NOW() - INTERVAL '24 hours';
  $$
);
