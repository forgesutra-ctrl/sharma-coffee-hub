# Subscription Webhook Setup Guide

## Overview

This guide explains how to set up the webhook-based subscription flow where subscriptions are only created in `user_subscriptions` **after** payment is confirmed via Razorpay webhook.

## Flow Diagram

```
1. User clicks "Setup Subscription"
   ↓
2. Frontend → create-razorpay-subscription Edge Function
   ↓
3. Edge Function creates Razorpay subscription
   ↓
4. Edge Function saves to pending_subscriptions table (temporary)
   ↓
5. User redirected to Razorpay payment page
   ↓
6. User completes payment
   ↓
7. Razorpay → Webhook → razorpay-subscription-webhook Edge Function
   ↓
8. Webhook moves data from pending_subscriptions → user_subscriptions
   ↓
9. User redirected to success page
```

## Step 1: Run Database Migration

Run the migration to create the `pending_subscriptions` table:

```sql
-- File: supabase/migrations/20260120000000_create_pending_subscriptions.sql
-- Run this in Supabase SQL Editor
```

The migration creates:
- `pending_subscriptions` table with 1-hour expiry
- Indexes for performance
- RLS policies for security

## Step 2: Deploy Edge Functions

The following functions have been updated:

1. **`create-razorpay-subscription`** - Now saves to `pending_subscriptions`
2. **`razorpay-subscription-webhook`** - Handles `subscription.authenticated` and `subscription.activated` events

Deploy them:

```bash
supabase functions deploy create-razorpay-subscription
supabase functions deploy razorpay-subscription-webhook
```

## Step 3: Configure Razorpay Webhook

1. **Log into Razorpay Dashboard**
   - Go to https://dashboard.razorpay.com

2. **Navigate to Webhooks**
   - Settings → Webhooks
   - Click **+ Add New Webhook**

3. **Enter Webhook Details**
   - **Webhook URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/razorpay-subscription-webhook`
     - Replace `YOUR_PROJECT` with your Supabase project reference ID
   - **Alert Email**: Your email address

4. **Select Events**
   - ✅ `subscription.authenticated` (Payment confirmed)
   - ✅ `subscription.activated` (Subscription activated)
   - ✅ `subscription.charged` (Recurring payment)
   - ✅ `subscription.cancelled` (Subscription cancelled)
   - ✅ `subscription.paused` (Subscription paused)
   - ✅ `subscription.completed` (Subscription completed)
   - ✅ `subscription.payment_failed` (Payment failed)

5. **Create Webhook**
   - Click **Create Webhook**
   - **IMPORTANT**: Copy the **Webhook Secret** (starts with `whsec_...`)

## Step 4: Add Webhook Secret to Supabase

1. **Go to Supabase Dashboard**
   - Project Settings → Edge Functions → Secrets

2. **Add New Secret**
   - **Key**: `RAZORPAY_WEBHOOK_SECRET`
   - **Value**: `whsec_YOUR_SECRET_FROM_RAZORPAY` (paste the secret from Step 3)
   - Click **Save**

## Step 5: Test the Flow

1. **Add Product to Cart**
   - Add any product as subscription
   - Go to checkout

2. **Create Subscription**
   - Click "Setup Subscription"
   - You should be redirected to Razorpay payment page

3. **Complete Payment**
   - Complete payment on Razorpay
   - You'll be redirected back to your app

4. **Verify in Database**
   ```sql
   -- Check pending_subscriptions (should be empty after payment)
   SELECT * FROM pending_subscriptions ORDER BY created_at DESC LIMIT 5;
   
   -- Check user_subscriptions (should have new subscription)
   SELECT * FROM user_subscriptions ORDER BY created_at DESC LIMIT 5;
   ```

5. **Check Edge Function Logs**
   - Go to Supabase Dashboard → Edge Functions → `razorpay-subscription-webhook` → Logs
   - Look for: `✅ Subscription created in database after payment confirmation`

## Troubleshooting

### Webhook Not Firing?

1. **Check Razorpay Dashboard**
   - Go to Settings → Webhooks → View logs
   - Check if webhook is being called
   - Look for error messages

2. **Verify Webhook URL**
   - Ensure URL is correct: `https://YOUR_PROJECT.supabase.co/functions/v1/razorpay-subscription-webhook`
   - Test the URL manually (should return 200 OK)

3. **Check Webhook Secret**
   - Verify `RAZORPAY_WEBHOOK_SECRET` is set in Supabase Edge Function secrets
   - Ensure it matches the secret from Razorpay dashboard

### Subscription Not Created in Database?

1. **Check Edge Function Logs**
   - Supabase → Edge Functions → `razorpay-subscription-webhook` → Logs
   - Look for error messages
   - Check if `subscription.authenticated` event is being received

2. **Verify pending_subscriptions Table**
   - Check if table exists: `SELECT * FROM pending_subscriptions LIMIT 1;`
   - Check if data is in pending table but not moved to user_subscriptions

3. **Check Webhook Signature**
   - The webhook verifies the signature from Razorpay
   - If signature verification fails, check the logs for "Invalid webhook signature"

### Pending Subscriptions Not Expiring?

The `pending_subscriptions` table has an `expires_at` column set to 1 hour from creation. You can manually clean up expired subscriptions:

```sql
-- Delete expired pending subscriptions (older than 1 hour)
DELETE FROM pending_subscriptions 
WHERE expires_at < NOW();
```

You can also set up a scheduled job (cron) to clean up expired subscriptions automatically.

## Benefits

✅ **No Abandoned Subscriptions**: Subscriptions only created after payment confirmation  
✅ **Payment Verification**: Webhook ensures payment was successful  
✅ **Automatic Cleanup**: Pending subscriptions expire after 1 hour  
✅ **Secure**: Webhook signature verification prevents unauthorized access  
✅ **Complete Lifecycle**: Handles all subscription events (charged, cancelled, paused, etc.)

## Files Modified

1. ✅ `supabase/migrations/20260120000000_create_pending_subscriptions.sql` - New migration
2. ✅ `supabase/functions/create-razorpay-subscription/index.ts` - Updated to save to pending_subscriptions
3. ✅ `supabase/functions/razorpay-subscription-webhook/index.ts` - Updated to handle subscription.authenticated/activated

## Environment Variables Required

- ✅ `RAZORPAY_KEY_ID` (already set)
- ✅ `RAZORPAY_KEY_SECRET` (already set)
- 🆕 `RAZORPAY_WEBHOOK_SECRET` (get from Razorpay dashboard)
- ✅ `SUPABASE_URL` (auto-set)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (auto-set)

## Next Steps

1. Run the migration
2. Deploy the updated Edge Functions
3. Configure Razorpay webhook
4. Add webhook secret to Supabase
5. Test the flow
6. Monitor logs for any issues
