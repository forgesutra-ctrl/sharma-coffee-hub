# Check Edge Function Logs for 401 Error

## Current Status
- ✅ CORS fixed (OPTIONS returns 200)
- ❌ Authentication failing (POST returns 401)

## Check Supabase Dashboard Logs

1. Go to: https://app.supabase.com/project/cfuwclyvoemrutrcgxeq/edge-functions/create-razorpay-subscription
2. Click on **"Logs"** tab
3. Look for the most recent POST request (should show 401)
4. Check the console.log output - you should see:
   - `"Auth check: { hasAuthHeader: true/false, ... }"`
   - `"User authenticated: [user-id]"` (if auth succeeds)
   - OR error messages if auth fails

## What to Look For

### If you see: `"hasAuthHeader: false"`
- The Authorization header isn't being received
- Check that Checkout.tsx is passing the header correctly

### If you see: `"User verification error: ..."`
- The token is invalid or expired
- User might need to log in again

### If you see: `"No user found in token"`
- Token format is wrong or token is invalid

## Quick Fix: Verify Token is Valid

The Edge Function should log the auth check. If the token is being received but verification fails, the user's session might be expired.

Try:
1. Log out and log back in
2. Try subscription checkout again
3. Check logs again

## Current Code Status

The Edge Function code is correct:
- ✅ Extracts token from "Bearer <token>"
- ✅ Uses SERVICE_ROLE_KEY to verify
- ✅ Calls getUser(token) correctly

If logs show the token is received but verification fails, the session token might be expired.
