# Deploy verify-razorpay-payment Edge Function

## Quick Deploy via Dashboard (Easiest)

1. **Go to Supabase Dashboard:**
   - https://app.supabase.com/project/cfuwclyvoemrutrcgxeq/edge-functions

2. **Find the function:**
   - Look for `verify-razorpay-payment` in the list
   - Click on it to open

3. **Update the code:**
   - Click "Edit" or the code editor
   - Copy the entire contents of `supabase/functions/verify-razorpay-payment/index.ts`
   - Paste it into the editor
   - Click "Deploy" or "Save"

## Install Supabase CLI (Optional - for future deployments)

### Windows (PowerShell)

```powershell
# Install via npm (if you have Node.js)
npm install -g supabase

# Or install via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Verify Installation

```powershell
supabase --version
```

## Deploy via CLI (After Installation)

```powershell
# Navigate to project directory
cd "C:\Users\KB\OneDrive\Documents\GitHub\sharma-coffee-hub-clean"

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref cfuwclyvoemrutrcgxeq

# Deploy the function
supabase functions deploy verify-razorpay-payment
```

## Deploy via npx (No Installation Required)

If you have Node.js installed, you can use npx without installing:

```powershell
# Navigate to project directory
cd "C:\Users\KB\OneDrive\Documents\GitHub\sharma-coffee-hub-clean"

# Deploy using npx
npx supabase functions deploy verify-razorpay-payment --project-ref cfuwclyvoemrutrcgxeq
```

## What Was Fixed

- ✅ Improved CORS headers (case-insensitive, added Max-Age)
- ✅ Better error handling for request body parsing
- ✅ More robust OPTIONS handler

## Verify Deployment

After deployment:
1. Try a one-time payment checkout
2. Complete the Razorpay payment
3. The order should be created successfully
4. Check Edge Function logs in Supabase Dashboard if issues persist
