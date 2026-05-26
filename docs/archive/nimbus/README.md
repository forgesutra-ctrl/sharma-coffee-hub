# Nimbuspost Integration Archive

Historical documentation for the Nimbuspost shipping integration used prior to the DTDC migration (Phase 1-6, May 2026).

## Status

NOT MAINTAINED. This integration has been fully removed from the codebase as of Phase 6c (May 2026). These docs are preserved for historical reference only.

## Files

- NIMBUSPOST_INTEGRATION.md — Original integration overview
- NIMBUS_SECRETS_STEP_BY_STEP.md — Supabase secrets configuration (no longer needed)
- NIMBUS_AND_ORDERS_DEBUG_HISTORY.md — Debug log from the Nimbus era
- NIMBUS_PUSH_MISSING_ORDERS.md — Backfill instructions (no longer needed)
- CREATE_SHIPMENT_CHECKLIST.md — Troubleshooting for Nimbus shipment creation

## What's still relevant

The orders table retains 3 columns from the Nimbuspost era:

- nimbuspost_awb_number
- nimbuspost_courier_name
- nimbuspost_tracking_url

These are kept for legacy orders that were shipped via Nimbuspost. UI fallbacks in OrdersPage.tsx, AccountOrders.tsx, OrderConfirmation.tsx, and AnalyticsPage.tsx continue to display these values for orders that pre-date the DTDC migration.

## Current shipping integration

For the active DTDC integration, see:

- DTDC_WORKING_CONFIG.md (repo root)
- ENV_SETUP.md → "Shipping Integration - DTDC" section
