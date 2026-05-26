# Shipping Provider Migration Plan

## Goal
Replace all shipping integrations with a clean, fresh DTDC integration.

## Final state we want
- ✅ DTDC active and creating shipments
- ✅ Nimbuspost code removed (Phase 6c)
- ✅ Prozo browser client removed (Phase 6b — `src/services/prozo.ts` deleted; types in `shipping-types.ts`)
- ❌ Old DTDC ghost code cleaned

---

## Current state (as of Phase 6b)

### ✅ Nimbuspost — REMOVED (Phase 6c, May 2026)

- 6 Edge Functions deleted from repo (6c-1); deployed functions to be removed in 6c-4
- `src/hooks/useNimbuspost.ts` — deleted
- `src/lib/nimbuspost/constants.ts` — deleted
- Documentation archived to `docs/archive/nimbus/`
- Legacy DB columns KEPT for historical orders: `nimbuspost_awb_number`, `nimbuspost_courier_name`, `nimbuspost_tracking_url`
- UI fallback display for legacy orders is preserved

Frontend (legacy column reads only):
- src/pages/Checkout.tsx
- src/pages/OrderConfirmation.tsx
- src/pages/account/AccountOrders.tsx
- src/pages/admin/AnalyticsPage.tsx
- src/pages/admin/OperationsPage.tsx
- src/pages/admin/OrdersPage.tsx
- src/pages/admin/ShippingPage.tsx
- src/integrations/supabase/types.ts

Backend / Supabase:
- supabase/migrations/20260202000000_nimbuspost_replace_dtdc.sql — **kept** (database history)

### ✅ Prozo — REMOVED (Phase 6b)
- ~~src/services/prozo.ts~~ — **deleted**; types moved to `src/services/shipping-types.ts`
- Frontend pages migrated to `@/services/dtdc` (Phase 4 complete)
- `vite.config.ts` Prozo dev proxy removed
- `.env.example` VITE_PROZO_* and VITE_STORE_* removed (DTDC uses Supabase Edge Function secrets)
- `supabase/migrations/20260406000000_orders_prozo_tracking.sql` — **kept** (database history; adds `tracking_number` / `shipping_provider` columns)

### ✅ DTDC — ACTIVE
- `src/services/dtdc.ts` — frontend client
- `src/services/shipping-types.ts` — shared type definitions
- `supabase/functions/dtdc-*` — Edge Functions (create, track, cancel, label)
- Webhooks call `dtdc-create-shipment` for new orders

### ⚫ DTDC — historical migrations only
- supabase/migrations/20260109140804_*.sql (do not delete - history)
- supabase/migrations/20260118000000_add_dtdc_awb_to_orders.sql (do not delete - history)
- supabase/migrations/20260202000000_nimbuspost_replace_dtdc.sql (do not delete - history)

---

## Migration phases

### ✅ Phase 1: Investigation — COMPLETE
- Mapped all files for all three providers
- Identified Prozo as the active provider
- Documented file footprint

### ✅ Phase 2: Build new DTDC integration — COMPLETE
- `src/services/dtdc.ts` and `supabase/functions/dtdc-*` created and tested

### ✅ Phase 3: Switch over — COMPLETE
- Live flows use DTDC (webhooks + admin/customer UI)

### ✅ Phase 4: Frontend Prozo → DTDC migration — COMPLETE
- All admin and customer pages import from `@/services/dtdc`
- No runtime imports from `@/services/prozo` remain

### ⏳ Phase 5 / 6: Cleanup — IN PROGRESS
- **Phase 6b (complete):** Delete `prozo.ts`, extract types to `shipping-types.ts`, remove Vite proxy and stale env vars
- **Phase 6c-1:** Nimbus code deletion — ✅ COMPLETE
- **Phase 6c-2:** Comment cleanup — ✅ COMPLETE
- **Phase 6c-3:** Docs + legal — 🟡 IN PROGRESS (this commit)
- **Phase 6c-4:** Delete deployed Nimbus Edge Functions — ⏳ PENDING (manual)
- **Remaining:** Cosmetic Prozo* renames, legalContent.ts update (Commit B)

---

## Critical rules during this migration

1. ❗ Migration SQL files in supabase/migrations/ — DO NOT DELETE old ones (they're database history)
2. ❗ Test everything on the `remove-old-shipping` branch first
3. ❗ Never deploy to live until verified working in dev

---

## DTDC API credentials
[KEEP IN A SECURE PLACE — DO NOT COMMIT TO GIT]
Add these to your local .env file (and to Supabase secrets later):
- DTDC_API_KEY=
- DTDC_CUSTOMER_CODE=
- DTDC_API_URL=
- DTDC_USERNAME=
- DTDC_PASSWORD=
(Exact field names depend on DTDC's docs)