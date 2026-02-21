# Webhook Queue Cron Setup

The migration `20260220000003_cron_process_webhook_queue.sql` requires **Supabase Vault** secrets to be set up first.

## Step 1: Create Vault Secrets

Run this in the Supabase SQL Editor (replace with your actual values):

```sql
-- Replace YOUR_PROJECT_REF with your Supabase project reference (e.g. cffjywlxvmklbuoyqbhz)
-- Replace YOUR_ANON_KEY with your project's anon/publishable key
SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
SELECT vault.create_secret('YOUR_ANON_KEY', 'anon_key');
```

## Step 2: Run Migrations

```bash
supabase db push
```

## Alternative: Manual Cron (without Vault)

If you prefer not to use Vault, run this SQL manually after replacing placeholders:

```sql
SELECT cron.schedule(
  'process-webhook-queue-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-webhook-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);
```
