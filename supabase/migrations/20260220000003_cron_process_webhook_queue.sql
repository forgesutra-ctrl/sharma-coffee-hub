-- Cron job: Process webhook queue every 5 minutes
-- Requires: pg_cron and pg_net extensions (enable in Dashboard if needed)
-- Requires: Store project_url and anon_key in Supabase Vault before running:
--   SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
--   SELECT vault.create_secret('YOUR_ANON_KEY', 'anon_key');

-- Schedule: every 5 minutes (cron.schedule upserts by job name)
SELECT cron.schedule(
  'process-webhook-queue-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/process-webhook-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);
