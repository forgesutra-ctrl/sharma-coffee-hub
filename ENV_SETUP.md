# Environment Variables Setup Guide

This document provides a comprehensive guide for configuring all required environment variables for the Sharma Coffee Works application.

## Table of Contents

- [Frontend Environment Variables](#frontend-environment-variables)
- [Edge Function Environment Variables](#edge-function-environment-variables)
- [Configuration Status](#configuration-status)
- [Setup Instructions](#setup-instructions)

---

## Frontend Environment Variables

These variables are stored in the `.env` file in the project root and are used by the frontend React application.

### Required Variables (Already Configured)

| Variable | Description | Status | Value |
|----------|-------------|--------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ Configured | `https://cfuwclyvoemrutrcgxeq.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key for client-side auth | ✅ Configured | Auto-configured |

---

## Edge Function Environment Variables

These variables are configured in the **Supabase Dashboard** under Settings > Edge Functions > Secrets. They are NOT stored in the `.env` file.

### Auto-Configured by Supabase

These are automatically available in all edge functions:

| Variable | Description | Status |
|----------|-------------|--------|
| `SUPABASE_URL` | Supabase project URL | ✅ Auto-configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations | ✅ Auto-configured |

### Payment Gateway - Razorpay (CRITICAL)

Required for payment processing. **Application will not accept payments without these.**

| Variable | Description | Required | Where to Get |
|----------|-------------|----------|--------------|
| `RAZORPAY_KEY_ID` | Razorpay public key ID | ✅ Yes | [Razorpay Dashboard](https://dashboard.razorpay.com/) > API Keys |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | ✅ Yes | [Razorpay Dashboard](https://dashboard.razorpay.com/) > API Keys |

**Status:** ⚠️ **NOT CONFIGURED** - Payment features will fail

**Affected Features:**
- Online payments
- Cash on Delivery (COD) advance payments
- Order creation after payment

**Edge Functions Using These:**
- `create-razorpay-order`
- `verify-razorpay-payment`

### Email Service - Resend (CRITICAL)

Required for authentication and OTP emails. **Users cannot log in without this.**

| Variable | Description | Required | Where to Get |
|----------|-------------|----------|--------------|
| `RESEND_API_KEY` | Resend API key for sending emails | ✅ Yes | [Resend API Keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | Verified sender email address | ✅ Yes | [Resend Domains](https://resend.com/domains) |

**Status:** ⚠️ **NOT CONFIGURED** - Authentication will fail

**Affected Features:**
- User login via OTP
- Email verification
- Password reset emails

**Edge Functions Using These:**
- `send-otp`
- `verify-otp`

### AI Chatbot (OPTIONAL)

The AI customer support chatbot can be configured with your preferred AI service provider.

**Status:** ⚠️ **NOT CONFIGURED** - Chatbot will show error message if enabled

**Affected Features:**
- AI customer support chatbot
- Product recommendations
- Customer inquiries

**Edge Functions Using This:**
- `ai-chat`

**Fallback:** If not configured, the chatbot button will still appear but users will see an error message when trying to use it.

### Shipping Integration - DTDC

The DTDC shipping integration uses Supabase Edge Function secrets (NOT browser-side `VITE_` variables). Set these via the Supabase dashboard (Project Settings → Edge Functions → Secrets):

**DTDC API credentials:**
- `DTDC_API_KEY` (required) — DTDC API key for shipment creation
- `DTDC_CUSTOMER_CODE` (required) — DTDC customer code
- `DTDC_ACCESS_TOKEN` (required) — DTDC access token
- `DTDC_TRACKING_USERNAME` (required) — DTDC tracking API username
- `DTDC_TRACKING_PASSWORD` (required) — DTDC tracking API password
- `DTDC_API_BASE_URL` (optional, default: `https://dtdcapi.shipsy.io`) — DTDC API base URL
- `DTDC_TRACKING_BASE_URL` (optional) — DTDC tracking API base URL

**Warehouse / pickup details:**
- `STORE_NAME` (required) — Warehouse name
- `STORE_PHONE` (required) — Warehouse contact phone
- `STORE_EMAIL` (required) — Warehouse contact email
- `STORE_ADDRESS` (required) — Warehouse street address
- `STORE_CITY` (required) — Warehouse city
- `STORE_STATE` (required) — Warehouse state
- `STORE_PINCODE` (required) — Warehouse pincode

**Affected features:** Order creation triggers automatic DTDC AWB generation via the payment webhook. Admin can also manually create/track/cancel shipments and download shipping labels.

**Active Edge Functions:**
- `dtdc-create-shipment` — Creates DTDC AWB for an order
- `dtdc-track` — Fetches tracking events for an AWB
- `dtdc-cancel` — Cancels a DTDC shipment
- `dtdc-shipping-label` — Downloads label PDF for an AWB

For staging vs production credentials and detailed configuration, see `DTDC_WORKING_CONFIG.md` at the repo root.

**Legacy note:** The `orders` table retains 3 columns (`nimbuspost_awb_number`, `nimbuspost_courier_name`, `nimbuspost_tracking_url`) for orders that pre-date the DTDC migration. No Nimbus secrets are required; these columns are read-only fallback display in customer/admin UI.

---

## Configuration Status

### Current Status Summary

| Service | Status | Impact | Action Required |
|---------|--------|--------|-----------------|
| **Supabase** | ✅ Configured | None - Working | None |
| **Razorpay** | ❌ Not Configured | **HIGH** - No payments | Configure immediately |
| **Resend** | ❌ Not Configured | **HIGH** - No auth | Configure immediately |
| **AI Chatbot** | ❌ Not Configured | **MEDIUM** - Chatbot down | Configure for better UX |
| **DTDC** | Configure in Supabase | **MEDIUM** - Auto shipments | Set DTDC API and warehouse secrets (see above) |

### Build Status

✅ **Application builds successfully with current configuration**

The application compiles and runs without errors. However, the following features will not work until their respective environment variables are configured:

1. **Payment Processing** - Requires Razorpay
2. **User Authentication** - Requires Resend
3. **AI Chatbot** - Optional feature
4. **Automated Shipping** - Requires DTDC (see Shipping Integration - DTDC section)

---

## Setup Instructions

### Step 1: Configure Razorpay (CRITICAL)

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up or log in
3. Navigate to **Settings** > **API Keys**
4. Click **Generate Key** to create a new key pair
5. Copy both the **Key ID** (starts with `rzp_test_` or `rzp_live_`) and **Key Secret**
6. Add to Supabase:
   ```bash
   # In Supabase Dashboard > Settings > Edge Functions > Secrets
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxx
   ```

**Test vs Live:**
- For testing: Use keys starting with `rzp_test_`
- For production: Use keys starting with `rzp_live_`

### Step 2: Configure Resend (CRITICAL)

1. Go to [Resend](https://resend.com/)
2. Sign up or log in
3. Navigate to **API Keys** and create a new key
4. Go to **Domains** and verify your sending domain
5. Add to Supabase:
   ```bash
   # In Supabase Dashboard > Settings > Edge Functions > Secrets
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

**Important:**
- Use a verified domain in `RESEND_FROM_EMAIL`
- For testing, you can use Resend's sandbox domain

### Step 3: Configure AI Chatbot (OPTIONAL)

The AI chatbot can be configured with your preferred AI service provider. Contact the development team for configuration details.

### Step 4: Configure DTDC (Shipping)

1. Obtain DTDC API credentials and warehouse/pickup details from your DTDC account (see `DTDC_WORKING_CONFIG.md` for staging values).
2. Add to Supabase Edge Function secrets:
   ```bash
   # In Supabase Dashboard > Settings > Edge Functions > Secrets
   DTDC_API_KEY=your-dtdc-api-key
   DTDC_CUSTOMER_CODE=your-customer-code
   DTDC_ACCESS_TOKEN=your-access-token
   DTDC_TRACKING_USERNAME=your-tracking-username
   DTDC_TRACKING_PASSWORD=your-tracking-password
   STORE_NAME=Sharma Coffee Works
   STORE_PHONE=your-warehouse-phone
   STORE_EMAIL=your-warehouse-email
   STORE_ADDRESS=your-warehouse-address
   STORE_CITY=your-city
   STORE_STATE=your-state
   STORE_PINCODE=your-pincode
   ```
3. Deploy Edge Functions: `dtdc-create-shipment`, `dtdc-track`, `dtdc-cancel`, `dtdc-shipping-label`.

### Step 5: Verify Configuration

After configuring the environment variables:

1. Deploy/redeploy your edge functions (they auto-reload with new secrets)
2. Test payment flow in the application
3. Test user authentication (OTP login)
4. Test AI chatbot (if configured)
5. Test shipping integration (if configured)

---

## Security Best Practices

### DO NOT:
- ❌ Commit `.env` file to GitHub
- ❌ Share API keys publicly
- ❌ Use production keys in development
- ❌ Hardcode secrets in frontend code
- ❌ Expose service role keys in client-side code

### DO:
- ✅ Use `.env` file for frontend variables only
- ✅ Store edge function secrets in Supabase Dashboard
- ✅ Use test/sandbox keys for development
- ✅ Rotate keys regularly
- ✅ Use different keys for staging and production
- ✅ Keep `.env` in `.gitignore`

---

## Troubleshooting

### Build Errors

If you encounter build errors:
```bash
npm run build
```

Common issues:
- Missing `VITE_SUPABASE_URL` - Check `.env` file
- Missing `VITE_SUPABASE_ANON_KEY` - Check `.env` file

### Runtime Errors

**Payment errors:**
- Check Razorpay keys are configured in Supabase
- Verify keys are valid and not expired
- Check Razorpay dashboard for test mode vs live mode

**Authentication errors:**
- Check Resend API key is configured
- Verify sending email domain is verified
- Check Resend dashboard for email delivery status

**Chatbot errors:**
- Check AI service API key is configured
- Verify API key has not exceeded quota
- Check browser console for specific error messages

**Shipping errors:**
- Check DTDC API credentials and warehouse secrets in Edge Function secrets
- Verify DTDC API is accessible; see `DTDC_WORKING_CONFIG.md` or contact your shipping partner support if integration fails

---

## Edge Function Secrets Management

To update edge function secrets in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Edge Functions** > **Secrets**
3. Click **Add Secret**
4. Enter the secret name and value
5. Click **Save**

**Note:** Edge functions automatically reload when secrets are updated.

---

## Support

For issues with:
- **Supabase:** [Supabase Support](https://supabase.com/support)
- **Razorpay:** [Razorpay Support](https://razorpay.com/support/)
- **Resend:** [Resend Support](https://resend.com/support)
- **AI Chatbot:** Contact development team
- **Shipping (DTDC):** Contact your shipping partner support or see `DTDC_WORKING_CONFIG.md`

---

## Fixes Applied

### Bug Fixes in This Setup

1. **Fixed: VITE_SUPABASE_PUBLISHABLE_KEY reference**
   - **Issue:** Code was referencing `VITE_SUPABASE_PUBLISHABLE_KEY` which didn't exist
   - **Fix:** Updated `src/integrations/supabase/client.ts` and `src/components/coffee/AIChatBot.tsx` to use `VITE_SUPABASE_ANON_KEY`
   - **Files Modified:**
     - `src/integrations/supabase/client.ts:6`
     - `src/components/coffee/AIChatBot.tsx:76`

2. **Added: Comprehensive .env documentation**
   - **Issue:** .env file had no comments or structure
   - **Fix:** Added clear sections and inline documentation

3. **Created: This setup guide**
   - **Issue:** No documentation for environment variable setup
   - **Fix:** Created ENV_SETUP.md with complete instructions

---

Last Updated: 2026-01-14
