# Shipping Provider Migration Plan

## Goal
Replace all shipping integrations with a clean, fresh DTDC integration.

## Final state we want
- ✅ DTDC active and creating shipments
- ❌ Nimbuspost code removed
- ❌ Prozo code removed
- ❌ Old DTDC ghost code cleaned

---

## Current state (as of investigation)

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

### 🟡 Prozo — ACTIVE (9 files) — DO NOT TOUCH YET
- .env.example
- src/hooks/useNimbuspost.ts (shared with Nimbus)
- src/pages/account/AccountOrders.tsx (shared)
- src/pages/admin/OperationsPage.tsx (shared)
- src/pages/admin/OrdersPage.tsx (shared)
- src/pages/admin/ShippingPage.tsx (shared)
- src/services/prozo.ts
- supabase/migrations/20260406000000_orders_prozo_tracking.sql
- vite.config.ts

### ⚫ DTDC — GHOST (4 files, historical only)
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

### ⏳ Phase 2: Build new DTDC integration (NEXT)
- Build DTDC alongside Prozo (do NOT remove Prozo yet)
- Create new files in clearly separated location (e.g., src/services/dtdc.ts)
- Create new Supabase functions for DTDC
- Use Cursor AI chat to scaffold the new integration
- Test thoroughly in development before switching

### ⏳ Phase 3: Switch over
- Switch live site from Prozo to DTDC
- Monitor for issues
- Keep Prozo code temporarily as rollback option

### ⏳ Phase 4: Cleanup
- Remove all Nimbuspost code
- Remove all Prozo code
- Update documentation
- Final commit and deploy

---

## Critical rules during this migration

1. ❗ Migration SQL files in supabase/migrations/ — DO NOT DELETE old ones (they're database history)
2. ❗ Do not touch Prozo code until DTDC is fully tested
3. ❗ Test everything on the `remove-old-shipping` branch first
4. ❗ Never deploy to live until verified working in dev

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