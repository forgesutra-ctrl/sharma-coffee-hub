# 🚨 URGENT: Deploy Edge Function to Fix CORS Error

## Current Status
- ✅ **Frontend code**: Fixed and committed
- ❌ **Edge Function**: Fixed locally but NOT deployed to production
- 🔴 **Error**: CORS blocking `x-client-info` header

## Why You're Getting CORS Error

The production Edge Function at `cfuwclyvoemrutrcgxeq.supabase.co` still has **old CORS headers** that don't allow `x-client-info`. Your local code is fixed, but Supabase is running the old deployed version.

## ⚡ Quick Fix: Deploy via Supabase Dashboard

### Step 1: Open Supabase Dashboard
Go to: https://app.supabase.com/project/cfuwclyvoemrutrcgxeq/edge-functions

### Step 2: Find the Function
Click on **`create-razorpay-subscription`** in the list

### Step 3: Edit the Code
1. Click **"Edit Function"** or **"View Code"** button
2. You'll see the current deployed code

### Step 4: Replace CORS Headers
Find this line (around line 7):
```typescript
"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
```

Replace it with:
```typescript
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
```

### Step 5: Update Request Interface
Find this interface (around line 10):
```typescript
interface CreateSubscriptionRequest {
  planId: string;
  productId: string;
  ...
}
```

Replace with:
```typescript
interface CreateSubscriptionRequest {
  razorpay_plan_id: string; // Razorpay plan ID from products.razorpay_plan_id
  productId: string;
  variantId?: string;
  quantity: number;
  preferredDeliveryDate: number;
  totalDeliveries: number;
  shippingAddress: Record<string, string>;
  amount: number;
}
```

### Step 6: Update Function Body
Find the section that extracts `planId` (around line 65-75):
```typescript
const {
  planId,
  productId,
  ...
} = requestData;
```

Replace with:
```typescript
const {
  razorpay_plan_id,
  productId,
  variantId,
  quantity,
  preferredDeliveryDate,
  totalDeliveries,
  shippingAddress,
  amount,
} = requestData;
```

### Step 7: Remove subscription_plans Lookup
Find and DELETE this entire block (around lines 111-125):
```typescript
const { data: plan } = await supabaseClient
  .from("subscription_plans")
  .select("*")
  .eq("id", planId)
  .maybeSingle();

if (!plan || !plan.razorpay_plan_id) {
  return new Response(
    JSON.stringify({ error: "Invalid subscription plan" }),
    { status: 400, ... }
  );
}
```

Replace with:
```typescript
// Validate razorpay_plan_id is provided (single source of truth from products table)
if (!razorpay_plan_id || typeof razorpay_plan_id !== 'string') {
  return new Response(
    JSON.stringify({ error: "Invalid Razorpay plan ID" }),
    { status: 400, ... }
  );
}
```

### Step 8: Update Razorpay API Call
Find where it uses `plan.razorpay_plan_id` (around line 154):
```typescript
plan_id: plan.razorpay_plan_id,
```

Replace with:
```typescript
plan_id: razorpay_plan_id,
```

### Step 9: Update Database Insert
Find the `user_subscriptions.insert` (around line 200):
```typescript
plan_id: planId,
```

Remove that line (or comment it out) since we're not using subscription_plans table anymore.

### Step 10: Deploy
Click **"Deploy"** or **"Save"** button

---

## ✅ OR: Copy Entire File

**Easier option**: Copy the entire contents of:
`supabase/functions/create-razorpay-subscription/index.ts`

And paste it into the Supabase Dashboard editor, then click Deploy.

---

## After Deployment

1. Wait 10-30 seconds for deployment to complete
2. Refresh your browser (hard refresh: Ctrl+Shift+R)
3. Try subscription checkout again
4. CORS error should be gone ✅

---

## Verify Deployment

Check Supabase Dashboard → Edge Functions → `create-razorpay-subscription` → **Logs** tab. You should see:
- "User authenticated: [user-id]"
- "Creating Razorpay subscription: { plan_id: 'plan_...' }"

If you see these logs, the function is working!
