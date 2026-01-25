# Deploy Edge Functions - Quick Guide

## Functions to Deploy

1. ✅ **verify-razorpay-payment** (UPDATED - phone normalization, explicit order numbers, critical items)
2. ✅ **razorpay-webhook** (UPDATED - phone normalization, critical items)
3. ✅ **recover-missing-orders** (NEW - recovery mechanism)

---

## Option 1: Deploy via Supabase Dashboard (Recommended)

### Step 1: Deploy verify-razorpay-payment

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Find **verify-razorpay-payment** function
3. Click **Edit** or **Deploy**
4. Copy the entire contents of `supabase/functions/verify-razorpay-payment/index.ts`
5. Paste into the editor
6. Click **Deploy** or **Save**

### Step 2: Deploy razorpay-webhook

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Find **razorpay-webhook** function
3. Click **Edit** or **Deploy**
4. Copy the entire contents of `supabase/functions/razorpay-webhook/index.ts`
5. Paste into the editor
6. Click **Deploy** or **Save**

### Step 3: Deploy recover-missing-orders (NEW)

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **Create Function** or **New Function**
3. Name it: `recover-missing-orders`
4. Copy the entire contents of `supabase/functions/recover-missing-orders/index.ts`
5. Paste into the editor
6. Click **Deploy** or **Save**

---

## Option 2: Deploy via Supabase CLI

If you have Supabase CLI installed:

```bash
# Navigate to project directory
cd "c:\Users\KB\OneDrive\Documents\GitHub\sharma-coffee-hub-clean"

# Deploy verify-razorpay-payment
supabase functions deploy verify-razorpay-payment

# Deploy razorpay-webhook
supabase functions deploy razorpay-webhook

# Deploy recover-missing-orders (new)
supabase functions deploy recover-missing-orders
```

---

## Option 3: Deploy via Git (If using Supabase Git integration)

If your Supabase project is connected to Git:

1. Commit the changes:
   ```bash
   git add supabase/functions/
   git commit -m "Fix order creation reliability - phone normalization, explicit order numbers, critical items"
   git push
   ```

2. Supabase will automatically deploy the functions

---

## Verification

After deploying, test each function:

### Test verify-razorpay-payment
- Place a test order
- Verify order is created with proper order_number
- Verify phone number is normalized (check database)

### Test razorpay-webhook
- The webhook will be called automatically when payments are captured
- Check logs for any errors

### Test recover-missing-orders
- Call the function via HTTP:
  ```bash
  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/recover-missing-orders \
    -H "Authorization: Bearer YOUR_ANON_KEY" \
    -H "Content-Type: application/json"
  ```
- Or use Supabase Dashboard → Edge Functions → recover-missing-orders → Invoke

---

## What Changed

### verify-razorpay-payment/index.ts
- ✅ Phone number normalization (removes +91)
- ✅ Explicit order number generation
- ✅ Critical order items creation (rollback if items fail)
- ✅ Enhanced error logging

### razorpay-webhook/index.ts
- ✅ Phone number normalization
- ✅ Critical order items creation
- ✅ Better error handling

### recover-missing-orders/index.ts (NEW)
- ✅ Checks Razorpay for captured payments
- ✅ Compares with database orders
- ✅ Reports missing orders

---

## Next Steps

1. ✅ Deploy all three functions
2. ✅ Run database migration (if not done yet)
3. ✅ Test with a sample order
4. ✅ Monitor logs for 24-48 hours
5. ✅ Set up recovery function to run periodically (optional)

---

## Troubleshooting

If deployment fails:
1. Check function logs in Supabase Dashboard
2. Verify environment variables are set:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Check function syntax is correct
4. Try deploying one function at a time
