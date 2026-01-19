# Order Notification Function

This Edge Function sends email and WhatsApp notifications to customers when their order is confirmed.

## Features

- ✅ Email notifications via Resend API
- ✅ WhatsApp notifications via Twilio API
- ✅ Beautiful HTML email templates
- ✅ Formatted WhatsApp messages
- ✅ Includes order details, shipping address, and tracking info
- ✅ Handles COD (Cash on Delivery) orders
- ✅ Non-blocking (doesn't fail if one service is down)

## Setup Instructions

### 1. Email Setup (Resend)

1. Sign up at [Resend.com](https://resend.com)
2. Verify your domain (e.g., `sharmacoffeeworks.com`)
3. Get your API key from the dashboard
4. Add to Supabase environment variables:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```

**Note:** Update the `from` email in `index.ts` to match your verified domain:
```typescript
from: "Sharma Coffee Works <orders@sharmacoffeeworks.com>"
```

### 2. WhatsApp Setup (Twilio)

1. Sign up at [Twilio.com](https://www.twilio.com)
2. Get a Twilio account (free trial available)
3. Enable WhatsApp Sandbox or get a WhatsApp Business API number
4. Get your credentials from Twilio Console:
   - Account SID
   - Auth Token
   - WhatsApp number (format: `whatsapp:+14155238886`)
5. Add to Supabase environment variables:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

**Twilio WhatsApp Sandbox:**
- For testing, use Twilio's WhatsApp Sandbox
- Send "join [your-code]" to the sandbox number to enable messaging
- Production: Apply for WhatsApp Business API access

### 3. Deploy Function

```bash
# Deploy to Supabase
supabase functions deploy send-order-notification
```

Or use Supabase Dashboard:
1. Go to **Functions** → **send-order-notification**
2. Click **Deploy**

### 4. Test the Function

You can test manually via Supabase Dashboard:
1. Go to **Functions** → **send-order-notification** → **Invoke**
2. Use this test payload:

```json
{
  "orderId": "test-order-123",
  "customerEmail": "test@example.com",
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
    "addressLine2": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "phone": "+919876543210"
  },
  "paymentType": "prepaid"
}
```

## Integration

The function is automatically called from `verify-razorpay-payment` after order creation. No additional code changes needed in your frontend.

## Email Template

The email includes:
- Order confirmation header
- Order items table
- COD payment info (if applicable)
- Shipping address
- Tracking number (when available)
- Expected delivery date
- Contact information

## WhatsApp Message

The WhatsApp message includes:
- Order confirmation
- Order items list
- Total amount
- COD payment details (if applicable)
- Shipping address
- Tracking link (when available)
- Expected delivery date

## Error Handling

- If email service fails, WhatsApp still sends
- If WhatsApp service fails, email still sends
- Errors are logged but don't block order creation
- Function returns success even if one service fails

## Environment Variables Required

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

## Phone Number Format

Phone numbers should include country code:
- ✅ `+919876543210` (India)
- ✅ `+14155551234` (US)
- ❌ `9876543210` (will be auto-formatted to +91)

## Cost Estimates

- **Resend:** Free tier: 3,000 emails/month, then $20/month for 50,000 emails
- **Twilio WhatsApp:** ~$0.005-0.01 per message (varies by country)

## Troubleshooting

### Email not sending:
1. Check RESEND_API_KEY is set correctly
2. Verify domain is verified in Resend
3. Check Resend dashboard for delivery status

### WhatsApp not sending:
1. Check Twilio credentials are correct
2. Verify WhatsApp number format (must start with `whatsapp:+`)
3. For sandbox: Ensure customer has joined the sandbox
4. Check Twilio console for error logs

### Both failing:
1. Check function logs in Supabase Dashboard
2. Verify all environment variables are set
3. Test function manually with test payload
