# Order Notification Setup Guide

## Overview

Email and WhatsApp notifications are automatically sent to customers when their order is confirmed after successful payment.

## What Was Created

1. **Edge Function:** `supabase/functions/send-order-notification/index.ts`
   - Sends email via Resend API
   - Sends WhatsApp via Twilio API
   - Includes order details, shipping address, and tracking info

2. **Integration:** Updated `verify-razorpay-payment` function to automatically call notifications after order creation

3. **Configuration:** Updated `supabase/config.toml` to allow public access to notification function

## Quick Setup

### Step 1: Email Setup (Resend)

1. **Sign up:** Go to [resend.com](https://resend.com) and create an account
2. **Verify domain:** Add and verify your domain (e.g., `sharmacoffeeworks.com`)
3. **Get API key:** Copy your API key from the dashboard
4. **Add to Supabase:**
   - Go to **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
   - Add: `RESEND_API_KEY` = `re_xxxxxxxxxxxxx`

5. **Update sender email** in `send-order-notification/index.ts`:
   ```typescript
   from: "Sharma Coffee Works <orders@sharmacoffeeworks.com>"
   ```
   (Replace with your verified domain email)

### Step 2: WhatsApp Setup (Twilio)

1. **Sign up:** Go to [twilio.com](https://www.twilio.com) and create an account
2. **Get credentials:**
   - Account SID (starts with `AC`)
   - Auth Token
   - WhatsApp number (for testing, use Sandbox: `whatsapp:+14155238886`)

3. **Add to Supabase:**
   - Go to **Supabase Dashboard → Project Settings → Edge Functions → Secrets**
   - Add:
     - `TWILIO_ACCOUNT_SID` = `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
     - `TWILIO_AUTH_TOKEN` = `your_auth_token_here`
     - `TWILIO_WHATSAPP_FROM` = `whatsapp:+14155238886` (or your WhatsApp Business number)

4. **For Testing (Sandbox):**
   - In Twilio Console → Messaging → Try it out → Send a WhatsApp message
   - Follow instructions to join the sandbox
   - Send "join [code]" to the sandbox number

5. **For Production:**
   - Apply for WhatsApp Business API access in Twilio
   - Get approved WhatsApp Business number
   - Update `TWILIO_WHATSAPP_FROM` with your business number

### Step 3: Deploy Function

```bash
# Using Supabase CLI
supabase functions deploy send-order-notification

# Or via Dashboard:
# Go to Functions → send-order-notification → Deploy
```

### Step 4: Test

1. Place a test order
2. Complete payment
3. Check:
   - Email inbox for confirmation email
   - WhatsApp for confirmation message

## Email Template Features

- ✅ Beautiful HTML design with brand colors
- ✅ Order items table
- ✅ Shipping address
- ✅ COD payment details (if applicable)
- ✅ Tracking number (when available)
- ✅ Expected delivery date
- ✅ Contact information

## WhatsApp Message Features

- ✅ Formatted message with emojis
- ✅ Order items list
- ✅ Total amount
- ✅ COD payment details (if applicable)
- ✅ Shipping address
- ✅ Tracking link (when available)
- ✅ Expected delivery date

## Phone Number Format

The function automatically formats phone numbers:
- ✅ `+919876543210` (with country code) - Recommended
- ✅ `9876543210` (10 digits) - Auto-formatted to +91
- ✅ `0919876543210` (with leading 0) - Auto-formatted to +91

## Cost Estimates

- **Resend Email:**
  - Free: 3,000 emails/month
  - Paid: $20/month for 50,000 emails

- **Twilio WhatsApp:**
  - ~$0.005-0.01 per message
  - Varies by country
  - Free trial credits available

## Troubleshooting

### Email Not Sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify domain is verified in Resend dashboard
3. Check Resend dashboard → Emails for delivery status
4. Check function logs in Supabase Dashboard

### WhatsApp Not Sending

1. Check all Twilio credentials are correct
2. Verify `TWILIO_WHATSAPP_FROM` format: `whatsapp:+14155238886`
3. For sandbox: Ensure customer has joined sandbox
4. Check Twilio Console → Monitor → Logs for errors
5. Verify phone number format includes country code

### Both Services Failing

1. Check function logs in Supabase Dashboard → Functions → send-order-notification → Logs
2. Verify all environment variables are set
3. Test function manually via Dashboard → Invoke

## Manual Testing

You can test the function manually:

1. Go to **Supabase Dashboard → Functions → send-order-notification**
2. Click **Invoke**
3. Use this test payload:

```json
{
  "orderId": "test-123",
  "customerEmail": "your-email@example.com",
  "customerPhone": "+919876543210",
  "customerName": "Test Customer",
  "orderNumber": "ORD-001",
  "orderTotal": 1500.00,
  "orderItems": [
    {
      "product_name": "Premium Arabica Coffee",
      "quantity": 2,
      "unit_price": 750.00,
      "total_price": 1500.00,
      "weight": 500,
      "grind_type": "Whole Bean"
    }
  ],
  "shippingAddress": {
    "fullName": "Test Customer",
    "addressLine1": "123 Test Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phone": "+919876543210"
  },
  "paymentType": "prepaid"
}
```

## Integration Flow

1. Customer completes payment → Razorpay
2. Payment verified → `verify-razorpay-payment` function
3. Order created in database
4. **Notifications sent automatically** → `send-order-notification` function
5. Customer receives email + WhatsApp

## Notes

- Notifications are sent asynchronously (don't block order creation)
- If one service fails, the other still sends
- Errors are logged but don't affect order creation
- Tracking numbers are added when shipments are created (future enhancement)

## Support

For issues:
1. Check Supabase function logs
2. Check Resend/Twilio dashboards
3. Verify environment variables
4. Test function manually
