# Nimbuspost Integration

Shipping is handled via Nimbuspost. This document describes the integration and how to verify it.

## Components

1. **Edge Functions**
   - `create-nimbuspost-shipment` – Creates shipment after payment; updates `orders.nimbuspost_awb_number`, `nimbuspost_courier_name`, `nimbuspost_tracking_url`, `shipment_created_at`.
   - `nimbuspost-track` – Returns tracking status and history for an AWB.
   - `nimbuspost-shipping-label` – Returns PDF label for an AWB.
   - `nimbuspost-cancel` – Cancels a shipment by AWB.
   - `nimbuspost-check-serviceability` – Checks if a pincode is serviceable (optional for checkout).

2. **Database**
   - Migration `20260202000000_nimbuspost_replace_dtdc.sql` adds:
     - `nimbuspost_awb_number`, `nimbuspost_courier_name`, `nimbuspost_tracking_url`, `shipping_status`, `shipment_created_at` on `orders`.
   - Existing `dtdc_awb_number` values are copied to `nimbuspost_awb_number` before the DTDC column is dropped.

3. **Frontend**
   - Hook: `useNimbuspost()` – createConsignment, downloadShippingLabel, trackShipment, cancelShipment.
   - Tracking URL: `https://sharmacoffeeworks.odrtrk.live/{AWB}`.
   - Order confirmation and checkout show AWB and “Track Shipment” using this URL.
   - Account orders and admin Shipping/Operations use Nimbuspost for tracking and labels.

## Environment (Supabase Edge Function secrets)

- `NIMBUSPOST_EMAIL` – Nimbuspost account email.
- `NIMBUSPOST_PASSWORD` – Nimbuspost account password.
- Optional: `NIMBUSPOST_TRACKING_DOMAIN` (default: `sharmacoffeeworks.odrtrk.live`).

## Verification

1. **Apply migration**
   - Run migration `20260202000000_nimbuspost_replace_dtdc.sql` (or `supabase db push`).

2. **Deploy and configure**
   - Deploy: `create-nimbuspost-shipment`, `nimbuspost-track`, `nimbuspost-shipping-label`, `nimbuspost-cancel`, `nimbuspost-check-serviceability`.
   - Set `NIMBUSPOST_EMAIL` and `NIMBUSPOST_PASSWORD` in Supabase Edge Function secrets.

3. **Post-payment shipment**
   - Place a test order and complete payment.
   - In Supabase logs for `verify-razorpay-payment` and `create-nimbuspost-shipment`, confirm shipment creation and AWB.
   - In `orders`, confirm `nimbuspost_awb_number` and `nimbuspost_tracking_url` are set.

4. **Tracking**
   - Open “Track Shipment” on order confirmation or account orders; confirm status and history.
   - Or open `https://sharmacoffeeworks.odrtrk.live/{AWB}` directly.

5. **Admin**
   - In Admin → Shipping, create a shipment for an order (if your flow uses it) and download the label.
   - In Admin → Operations, track/cancel using AWB.

## API reference

- Nimbuspost API: https://documenter.getpostman.com/view/9692837/TW6wHnoz
