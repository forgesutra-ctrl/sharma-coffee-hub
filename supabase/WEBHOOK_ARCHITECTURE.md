# Razorpay Webhook Architecture

## Two-Webhook Design

To avoid duplicate handling and conflicts, we use **two separate webhook URLs** in Razorpay:

| Webhook | URL | Events |
|---------|-----|--------|
| **razorpay-webhook** | `.../functions/v1/razorpay-webhook` | `payment.captured`, `payment.failed`, `invoice.paid` |
| **razorpay-subscription-webhook** | `.../functions/v1/razorpay-subscription-webhook` | All `subscription.*` events |

## razorpay-webhook

**Handles:**
- `payment.captured` — One-time orders (including COD advance). Creates order from `pending_orders`.
- `payment.failed` — Deletes pending order on failure.
- `invoice.paid` — Subscription billing cycles. Creates delivery records in `subscription_deliveries`.

**Does NOT handle:** Any `subscription.*` events (ignored, return 200).

## razorpay-subscription-webhook

**Handles:**
- `subscription.authenticated` — Creates subscription in `user_subscriptions` from `pending_subscriptions`.
- `subscription.activated` — Activates or creates subscription.
- `subscription.charged` — Creates order for recurring billing cycle.
- `subscription.cancelled` — Updates status to cancelled.
- `subscription.paused` — Updates status to paused.
- `subscription.resumed` — Updates status to active.
- `subscription.completed` — Updates status to cancelled.
- `subscription.payment_failed` — Updates `last_payment_status`, sends notification.

## Razorpay Dashboard Configuration

Create **two webhooks** in Razorpay Dashboard → Settings → Webhooks:

1. **Webhook 1** — Payments
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/razorpay-webhook`
   - Events: `payment.captured`, `payment.failed`, `invoice.paid`

2. **Webhook 2** — Subscriptions
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/razorpay-subscription-webhook`
   - Events: `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.paused`, `subscription.resumed`, `subscription.completed`, `subscription.payment_failed`

Both use the same `RAZORPAY_WEBHOOK_SECRET` in Supabase Edge Function secrets.
