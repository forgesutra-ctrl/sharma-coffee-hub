# Deploy Edge Function to Fix CORS Error

## Issue
The `create-razorpay-subscription` Edge Function has been updated locally with CORS fixes, but it needs to be deployed to production for the changes to take effect.

## Deployment Steps

### Option 1: Using Supabase CLI (Recommended)

1. **Make sure you're logged in:**
   ```bash
   supabase login
   ```

2. **Link to your project (if not already linked):**
   ```bash
   supabase link --project-ref cfuwclyvoemrutrcgxeq
   ```

3. **Deploy the function:**
   ```bash
   cd c:\Users\KB\OneDrive\Documents\GitHub\sharma-coffee-hub
   supabase functions deploy create-razorpay-subscription
   ```

### Option 2: Using Supabase Dashboard

1. Go to https://app.supabase.com/project/cfuwclyvoemrutrcgxeq
2. Navigate to **Edge Functions** in the sidebar
3. Find `create-razorpay-subscription`
4. Click **Deploy** or **Redeploy**
5. Upload the file: `supabase/functions/create-razorpay-subscription/index.ts`

### Option 3: Using Supabase CLI with Project Reference

If you have the project reference:
```bash
supabase functions deploy create-razorpay-subscription --project-ref cfuwclyvoemrutrcgxeq
```

## Verify Deployment

After deployment, check:
1. Go to Supabase Dashboard → Edge Functions → `create-razorpay-subscription`
2. Check the **Logs** tab to see if it's running
3. Try the subscription checkout again
4. The CORS error should be resolved

## What Was Fixed

- ✅ CORS headers now allow `x-client-info` header
- ✅ Function accepts `razorpay_plan_id` directly from products table
- ✅ Removed dependency on `subscription_plans` table lookup
- ✅ Better error logging for debugging

## After Deployment

Once deployed, test:
1. Add a subscription product to cart
2. Go to checkout
3. Complete subscription payment
4. Should redirect to Razorpay without CORS errors
