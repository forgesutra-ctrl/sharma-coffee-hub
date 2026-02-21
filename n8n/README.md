# n8n Reconciliation Workflow

## Overview

The `reconciliation-workflow.json` runs daily at 8 AM IST to reconcile Razorpay payments with Supabase orders and sends a Telegram alert if any payments are missing from the orders table.

## Setup

### 1. Import the Workflow

- Open n8n
- Go to Workflows → Import from File
- Select `reconciliation-workflow.json`

### 2. Environment Variables

Set these in your n8n environment (or use n8n's credential system):

| Variable | Description |
|----------|-------------|
| `RAZORPAY_KEY_ID` | Razorpay API Key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay API Key Secret |
| `SUPABASE_URL` | Supabase project URL (e.g. https://xxx.supabase.co) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram chat ID to receive alerts |

### 3. Configure Credentials

**Razorpay (HTTP Basic Auth):**
- Create credential type: HTTP Basic Auth
- User: `RAZORPAY_KEY_ID` (or your key)
- Password: `RAZORPAY_KEY_SECRET` (or your secret)

**Supabase (HTTP Header Auth):**
- Create credential type: Header Auth
- Name: `apikey`, Value: Your Supabase anon key
- Add: `Authorization` = `Bearer YOUR_SERVICE_ROLE_KEY`

**Telegram:**
- Create Telegram credential with your bot token

### 4. Publish

Workflows with Schedule Trigger must be **saved and published** to run.

## Schedule

- **Time:** 8:00 AM IST (2:30 AM UTC)
- **Cron:** `30 2 * * *`
- **Timezone:** Asia/Kolkata

## Flow

1. Schedule Trigger fires at 8 AM IST
2. Compute yesterday's date range (start/end timestamps)
3. Fetch Razorpay payments (from/to yesterday, status=captured)
4. Fetch Supabase orders (created yesterday)
5. Compare: find payments not in orders table
6. If mismatches: Send Telegram alert with payment_id, amount, email
7. If no mismatches: Send "✅ Daily reconciliation complete — all payments matched"
