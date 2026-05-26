# Shipping Provider Migration Plan

## Goal
Replace all shipping integrations with a clean, fresh DTDC integration.

## Final state we want
- ✅ DTDC active and creating shipments
- ❌ Nimbuspost code removed
- ✅ Prozo browser client removed (Phase 6b — `src/services/prozo.ts` deleted; types in `shipping-types.ts`)
- ❌ Old DTDC ghost code cleaned

---

## Current state (as of Phase 6b)

### 🔴 Nimbuspost — DORMANT (30+ files)
Documentation:
- CREATE_SHIPMENT_CHECKLIST.md
- DATABASE_STATUS.md
- ENV_SETUP.md
- NIMBUSPOST_INTEGRATION.md
- NIMBUS_AND_ORDERS_DEBUG_HISTORY.md
- NIMBUS_PUSH_MISSING_ORDERS.md
- NIMBUS_SECRETS_STEP_BY_STEP.md
- README.md (mentions only)

Frontend:
- src/hooks/useNimbuspost.ts
- src/lib/nimbuspost/constants.ts
- src/pages/Checkout.tsx
- src/pages/OrderConfirmation.tsx
- src/pages/account/AccountOrders.tsx
- src/pages/admin/AnalyticsPage.tsx
- src/pages/admin/OperationsPage.tsx
- src/pages/admin/OrdersPage.tsx
- src/pages/admin/ShippingPage.tsx
- src/data/legalContent.ts
- src/integrations/supabase/types.ts

Backend / Supabase:
- supabase/config.toml
- supabase/functions/* (nimbuspost-utils, shipment, cancel, serviceability, label, track, nimbus, webhook, payment)

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
- NIMBUSPOST_INTEGRATION.md (mentions DTDC history)
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
- **Remaining:** Remove Nimbuspost code, cosmetic Prozo* renames, update remaining docs

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