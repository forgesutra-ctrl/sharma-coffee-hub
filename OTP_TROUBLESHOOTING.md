# OTP Not Working - Troubleshooting Guide

## Issue
Unable to receive OTP email when trying to log in at `http://localhost:8080/`

## Root Cause
The `send-otp` Edge Function requires **Resend API credentials** to be configured in Supabase.

## Quick Fix

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try sending OTP again
4. Look for error messages like:
   - `"Failed to send OTP"`
   - `"Email service not configured"`
   - `"Unable to send verification email"`

### Step 2: Configure Resend API (Required)

The Edge Function needs these environment variables in **Supabase Dashboard**:

1. **Go to Supabase Dashboard:**
   - https://app.supabase.com/project/cfuwclyvoemrutrcgxeq
   - Navigate to **Settings** > **Edge Functions** > **Secrets**

2. **Add these secrets:**
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

3. **Get Resend API Key:**
   - Sign up at https://resend.com/
   - Go to **API Keys** section
   - Create a new API key
   - Copy the key (starts with `re_`)

4. **Get Verified Email:**
   - In Resend dashboard, go to **Domains**
   - Verify your domain OR use Resend's sandbox domain for testing
   - Use verified email as `RESEND_FROM_EMAIL`

### Step 3: Verify Edge Function is Deployed

Check if `send-otp` function is deployed:

1. In Supabase Dashboard, go to **Edge Functions**
2. Verify `send-otp` function exists and is deployed
3. If not deployed, run:
   ```bash
   supabase functions deploy send-otp
   ```

### Step 4: Test Again

1. Clear browser cache
2. Try sending OTP again
3. Check email inbox (and spam folder)

## Alternative: Local Development

If you want to test locally without deploying:

1. **Start Supabase locally:**
   ```bash
   supabase start
   ```

2. **Set local environment variables:**
   ```bash
   # In .env.local or terminal
   export RESEND_API_KEY=re_xxxxxxxxxxxxx
   export RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

3. **Serve Edge Functions locally:**
   ```bash
   supabase functions serve send-otp --env-file .env.local
   ```

4. **Update frontend to use local function:**
   - The function will be available at `http://localhost:54321/functions/v1/send-otp`
   - You may need to update the Supabase client URL for local development

## Common Errors

### Error: "Email service not configured"
- **Cause:** `RESEND_FROM_EMAIL` not set
- **Fix:** Add `RESEND_FROM_EMAIL` secret in Supabase Dashboard

### Error: "Unable to send verification email"
- **Cause:** `RESEND_API_KEY` invalid or missing
- **Fix:** Verify API key is correct and active in Resend dashboard

### Error: "Failed to send OTP" (network error)
- **Cause:** Edge Function not deployed or not accessible
- **Fix:** Deploy function or check Supabase project URL

### No error, but no email received
- **Cause:** Email might be in spam, or Resend account has issues
- **Fix:** 
  - Check spam folder
  - Verify Resend account is active
  - Check Resend dashboard for email delivery logs

## Verification Checklist

- [ ] `RESEND_API_KEY` is set in Supabase Edge Function secrets
- [ ] `RESEND_FROM_EMAIL` is set and verified in Resend
- [ ] `send-otp` Edge Function is deployed
- [ ] Browser console shows no errors
- [ ] Email domain is verified in Resend
- [ ] Checked spam folder for OTP email

## Need Help?

If still not working:
1. Check Supabase Edge Function logs:
   - Dashboard > Edge Functions > `send-otp` > Logs
2. Check Resend dashboard for email delivery status
3. Verify Supabase project URL is correct in `.env` file
