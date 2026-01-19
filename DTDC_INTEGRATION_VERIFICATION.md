# DTDC Integration Verification & Testing Guide

## ✅ Implementation Complete

### What Was Implemented

1. **Created `create-dtdc-shipment` Edge Function**
   - Location: `supabase/functions/create-dtdc-shipment/index.ts`
   - Automatically creates DTDC shipment after payment
   - Saves AWB number to orders table
   - No admin authentication required (called from payment verification)

2. **Integrated into Payment Flow**
   - Updated: `supabase/functions/verify-razorpay-payment/index.ts`
   - Automatically calls shipment creation after order is created
   - Runs asynchronously (doesn't block order confirmation)
   - Includes AWB in email/WhatsApp notifications

3. **Added Database Column**
   - Migration: `supabase/migrations/20260118000000_add_dtdc_awb_to_orders.sql`
   - Adds `dtdc_awb_number` column to orders table
   - Adds `shipment_created_at` timestamp
   - Creates index for faster lookups

4. **Updated OrderConfirmation Page**
   - Location: `src/pages/OrderConfirmation.tsx`
   - Displays tracking number (AWB) if available
   - Shows "Track Shipment" button with DTDC tracking link
   - Shows "Shipment being prepared" message if AWB not yet available

5. **Updated Configuration**
   - Added `create-dtdc-shipment` to `supabase/config.toml`
   - Set `verify_jwt = false` to allow automatic calls

## 🔧 Setup Requirements

### 1. Database Migration

Run the migration to add the AWB column:

```sql
-- This is in: supabase/migrations/20260118000000_add_dtdc_awb_to_orders.sql
-- Run via Supabase Dashboard → SQL Editor or CLI
```

Or apply via Supabase CLI:
```bash
supabase db push
```

### 2. Environment Variables

Ensure these are set in Supabase Dashboard → Project Settings → Edge Functions → Secrets:

```
DTDC_BASE_URL=https://alphademodashboardapi.shipsy.io
DTDC_API_KEY=your_api_key_here
DTDC_CUSTOMER_CODE=GL017
DTDC_TRACKING_TOKEN=your_tracking_token (optional)
DTDC_ENV=staging (or production)
```

### 3. Deploy Functions

```bash
# Deploy the new shipment function
supabase functions deploy create-dtdc-shipment

# Redeploy payment verification (already updated)
supabase functions deploy verify-razorpay-payment
```

Or via Supabase Dashboard:
1. Go to **Functions** → **create-dtdc-shipment** → **Deploy**
2. Go to **Functions** → **verify-razorpay-payment** → **Deploy**

## 🧪 Testing Checklist

### Test 1: Complete Order Flow

1. **Place Test Order:**
   - Go to `/shop`
   - Add product to cart
   - Go to `/cart` → Checkout
   - Fill shipping address
   - Complete payment (use test Razorpay credentials)

2. **Verify Shipment Creation:**
   - Check Supabase Dashboard → **Table Editor** → **orders**
   - Find your test order
   - Verify `dtdc_awb_number` column has AWB number
   - Verify `shipment_created_at` has timestamp

3. **Check OrderConfirmation Page:**
   - After payment, you should be redirected to `/order-confirmation/[orderId]`
   - Should see "Track Your Order" card
   - Should display AWB number
   - "Track Shipment" button should work

4. **Verify Tracking Link:**
   - Click "Track Shipment" button
   - Should open DTDC tracking page with AWB
   - URL format: `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=[AWB]`

### Test 2: Check Function Logs

1. Go to **Supabase Dashboard** → **Functions** → **create-dtdc-shipment** → **Logs**
2. Look for:
   - `[DTDC] Creating shipment for order: [orderId]`
   - `[DTDC] Shipment created successfully. AWB: [awb]`
   - `[DTDC] AWB saved to order: [awb]`

3. Check **verify-razorpay-payment** logs:
   - `[Payment] Creating DTDC shipment for order: [orderId]`
   - `[Payment] Shipment created successfully. AWB: [awb]`

### Test 3: Admin Dashboard

1. Go to `/admin/orders` or `/admin/shipping`
2. Verify orders show AWB numbers
3. Verify shipments table has entries

### Test 4: Email/WhatsApp Notifications

1. Check email notification includes tracking number
2. Check WhatsApp message includes tracking link
3. Verify tracking link works

## 🐛 Troubleshooting

### Issue 1: AWB Not Being Created

**Symptoms:**
- Order created but `dtdc_awb_number` is NULL
- No shipment in shipments table

**Check:**
1. Function logs for errors
2. DTDC API credentials are correct
3. DTDC API is accessible
4. Phone number format (must be 10 digits, Indian format)
5. Pincode format (must be 6 digits)

**Fix:**
- Check Supabase function logs
- Verify DTDC credentials in environment variables
- Test DTDC API manually

### Issue 2: Function Not Being Called

**Symptoms:**
- No logs in `create-dtdc-shipment` function
- Order created but no shipment attempt

**Check:**
1. Verify `verify-razorpay-payment` is calling the function
2. Check function URL is correct
3. Verify service role key is set

**Fix:**
- Check `verify-razorpay-payment` logs
- Verify function is deployed
- Check function URL in code

### Issue 3: AWB Not Displaying on OrderConfirmation

**Symptoms:**
- AWB exists in database but not showing on page

**Check:**
1. Verify query includes `dtdc_awb_number`
2. Check browser console for errors
3. Verify order data structure

**Fix:**
- Check OrderConfirmation query
- Verify order interface includes `dtdc_awb_number`
- Check React DevTools for order data

### Issue 4: Tracking Link Not Working

**Symptoms:**
- AWB displayed but link doesn't work

**Check:**
1. Verify AWB format is correct
2. Test DTDC tracking URL manually
3. Check if DTDC tracking page is accessible

**Fix:**
- Verify tracking URL format
- Test with AWB manually
- Update tracking URL if DTDC changed format

## 📋 Manual Function Test

You can test the shipment function manually:

1. Go to **Supabase Dashboard** → **Functions** → **create-dtdc-shipment** → **Invoke**
2. Use this test payload:

```json
{
  "orderId": "test-order-id-here",
  "customerName": "Test Customer",
  "customerPhone": "9876543210",
  "customerEmail": "test@example.com",
  "shippingAddress": {
    "fullName": "Test Customer",
    "addressLine1": "123 Test Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phone": "9876543210"
  },
  "orderItems": [
    {
      "product_name": "Premium Coffee",
      "quantity": 1,
      "unit_price": 500,
      "total_price": 500
    }
  ],
  "totalWeight": 0.5,
  "orderAmount": 500,
  "paymentType": "prepaid"
}
```

## ✅ Success Criteria

- [ ] Order created successfully
- [ ] DTDC shipment created automatically
- [ ] AWB number saved to orders table
- [ ] AWB displayed on OrderConfirmation page
- [ ] Tracking link works and opens DTDC tracking
- [ ] Email notification includes AWB
- [ ] WhatsApp notification includes tracking link
- [ ] Admin dashboard shows AWB numbers

## 📝 Notes

- Shipment creation runs asynchronously (doesn't block order confirmation)
- If shipment creation fails, order still completes (non-critical)
- AWB may take a few seconds to appear (check after page loads)
- Tracking link format: `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=[AWB]`

## 🔗 Related Files

- `supabase/functions/create-dtdc-shipment/index.ts` - Shipment creation function
- `supabase/functions/verify-razorpay-payment/index.ts` - Payment verification (calls shipment)
- `supabase/functions/_shared/dtdc-utils.ts` - DTDC API utilities
- `src/pages/OrderConfirmation.tsx` - Order confirmation page (displays tracking)
- `supabase/migrations/20260118000000_add_dtdc_awb_to_orders.sql` - Database migration
