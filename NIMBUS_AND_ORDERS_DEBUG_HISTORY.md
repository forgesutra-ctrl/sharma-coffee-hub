# Nimbuspost & Orders – Change History and Debug Guide

This doc summarizes changes made around orders, Nimbuspost integration, and Supabase, plus how to fix the current "Missing or invalid Token" and console errors.

---

## 1. Change history (what was done)

### Payment → Nimbuspost (auto-push)

- **Bug:** After Razorpay payment verification, the code called `pushToNimbus()` (undefined) and used `nimbusPayload` (wrong variable) when calling the shipment API.
- **Fix:** In `supabase/functions/verify-razorpay-payment/index.ts`:
  - Replaced `pushToNimbus()` with `createShipment()`.
  - Replaced `nimbusPayload` with `shipmentPayload` in the fetch body and logs.
- **Result:** New paid orders are sent to Nimbuspost automatically once the token is valid.

### Supabase project / .env

- **Issue:** App was pointed at the wrong Supabase project (e.g. Pallaki / `cffjywlxvmklbuoyqbhz` or placeholder `your-project-ref`).
- **Fix:** `.env` and `supabase/config.toml` were pointed at the correct project **cfuwclyvoemrutrcgxeq** (Sharma Coffee). You must set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` for that project.

### config.toml

- **Issue:** Duplicate `[functions.create-nimbuspost-shipment]` caused "table already exists" when running `supabase link`.
- **Fix:** Removed the duplicate block from `supabase/config.toml`.

### Nimbuspost: treat API errors as failures

- **Issue:** Nimbuspost sometimes returns HTTP 200 with `{ "status": false, "message": "Missing or invalid Token in request" }`. We only treated `success === false` as error, so the app showed "Shipment created" even when the token was rejected.
- **Fix:** In `supabase/functions/push-order-to-nimbus/index.ts`:
  - Treat `res.status === false` (and existing error cases) as a failed response.
  - Return `success: false` and the API error message so the admin UI shows "Missing or invalid Token in request" instead of success.

### Nimbuspost: optional Bearer auth

- **Addition:** If Nimbuspost expects `Authorization: Bearer <key>`, you can set Edge Function secret **`NIMBUS_AUTH_STYLE`** = **`Bearer`**. The function then sends `Bearer <key>` instead of `token=<key>`.

### Nimbuspost: auth must be key=value (with equal sign)

- **Issue:** Nimbus returns "Invalid key=value pair (missing equal-sign) in Authorization header" when the header has no `=`. Sending `Authorization: Bearer <token>` (no `=`) is rejected.
- **Current behavior:** By default we send **`Authorization: token=<rawToken>`** so the value is a key=value pair with an equal sign. If the secret already contains `=`, it’s sent as-is. Only if you set **`NIMBUS_AUTH_STYLE`** = **`Bearer`** do we send `Bearer <token>`.
- **If you see the “missing equal-sign” error:** Remove **`NIMBUS_AUTH_STYLE`** from Edge Function secrets (or don’t set it) so we use the default `token=<key>` format.

### Orders UI: Nimbus “skipped” and errors

- **Addition:** When the Nimbus call is skipped (no key) or the API returns an error, the Orders page and `useNimbuspost` now show a clear warning/error message instead of a generic "Failed to create shipment".

### Log wording

- **Change:** In `create-nimbuspost-shipment`, the success log was updated from "Shipment created" to "Order pushed to Nimbuspost (appears in Orders list; use 'Ship' in Nimbuspost to book AWB)" so it’s clear we only create orders in Nimbuspost; AWB/shipment is created when you click **Ship** in Nimbuspost.

### Docs

- **NIMBUS_PUSH_MISSING_ORDERS.md:** When to push missing orders, where orders appear in Nimbuspost (Orders vs Fulfilled), and how to fix "Missing or invalid Token" (use Old API key, optional Bearer).
- **push-order-to-nimbus/README.md:** Troubleshooting step for "Missing or invalid Token" (regenerate key, try `NIMBUS_AUTH_STYLE=Bearer`).

### Removed: debug ingest calls

- **Removed:** All `fetch('http://127.0.0.1:7243/ingest/...')` calls were removed from `src/pages/admin/OrdersPage.tsx`. They were only for a local telemetry/debug tool and caused `ERR_CONNECTION_REFUSED` when that server wasn’t running.

---

## 2. Current status

- **Nimbuspost:** Create Shipment returns 200 but Nimbuspost responds with `{ "status": false, "message": "Missing or invalid Token in request" }`. The app now correctly shows this as an error (no false “Shipment created”).
- **Console:** You still see `POST http://127.0.0.1:7243/ingest/... net::ERR_CONNECTION_REFUSED`. There is **no** reference to `7243` or `ingest` or `b383587d` in the current repo; the removed code is gone. So this is either:
  - **Cached frontend:** An old JS bundle (e.g. `index-CDVHevfh.js`) still containing the old fetch. Fix: clear Vite cache, rebuild, hard refresh (see below).
  - **Browser extension:** Something (e.g. Cursor, analytics, dev tools) injecting or triggering that URL. Try in an incognito window or another browser without extensions.

---

## 3. What you need to do now

### A. Fix “Missing or invalid Token” (Nimbuspost)

1. **Use the Old API key (not New API email/password)**  
   In Nimbuspost → **Settings** → **API** (or **user_api**), under **“Old API Document”**, copy **“Your API Key”** (the long hex string). Do **not** use the email/password from “New API Document (Recommended)”.

2. **Set it in Supabase**  
   Supabase → your project (**cfuwclyvoemrutrcgxeq**) → **Project Settings** → **Edge Functions** → **Secrets**:
   - **`NIMBUS_API_KEY`** = that exact key (no spaces, no `Bearer ` prefix).

3. **If it still says “Missing or invalid Token”**  
   Add:
   - **`NIMBUS_AUTH_STYLE`** = **`Bearer`**  
   Then we send `Authorization: Bearer <your_key>`. Try Create Shipment again.

4. **Redeploy when you change the function code**  
   Changing **secrets** does not require redeploy. Redeploy after changing `push-order-to-nimbus` or `create-nimbuspost-shipment` so the new code is live. Use the project ref that matches your `.env` (see `supabase/config.toml`; for Sharma Coffee that’s **cfuwclyvoemrutrcgxeq**):
   ```bash
   npx supabase functions deploy push-order-to-nimbus --project-ref cfuwclyvoemrutrcgxeq
   npx supabase functions deploy create-nimbuspost-shipment --project-ref cfuwclyvoemrutrcgxeq
   ```
   If the project is already linked (`supabase link`), you can omit `--project-ref`.

### B. Get rid of 127.0.0.1 / ingest errors (if still present)

1. **Clear cache and rebuild**
   ```bash
   # From project root
   rm -rf node_modules/.vite
   npm run build
   ```
   Then hard refresh the app (Ctrl+Shift+R or Cmd+Shift+R), or restart the dev server and reload.

2. **If you still see the ingest request**  
   Open the app in a private/incognito window or another browser with extensions disabled. If the error disappears, a browser extension is likely triggering it; you can ignore it or disable that extension in your main browser.

---

## 4. Flow summary

1. **Admin clicks “Create Shipment”**  
   → Frontend calls `create-nimbuspost-shipment` with `order_id` / `order_number`.

2. **create-nimbuspost-shipment**  
   → Loads order + `order_items` from DB, builds payload (address, weight, items).  
   → Calls **push-order-to-nimbus** with that payload.

3. **push-order-to-nimbus**  
   → Reads `NIMBUS_API_KEY` (and optional `NIMBUS_AUTH_STYLE`, `NIMBUS_API_BASE_URL`, etc.).  
   → Sends `Authorization: token=<key>` or `Bearer <key>` to `https://api.nimbuspost.com/v1/order` (or your configured URL/path).  
   → If Nimbuspost returns `status: false` or an error message, we return `success: false` and that message to the UI.

4. **Nimbuspost**  
   → Creates an **order** in their system (visible under **Orders**, CHANNEL: API).  
   → You then click **Ship** in Nimbuspost to book the courier and get AWB/label.

---

## 5. Quick checklist

- [ ] **Supabase .env:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for project **cfuwclyvoemrutrcgxeq**.
- [ ] **Nimbuspost secret:** `NIMBUS_API_KEY` = Old API key (long hex from Nimbuspost → Settings → API → Old API Document).
- [ ] **Optional:** `NIMBUS_AUTH_STYLE` = `Bearer` if token still rejected.
- [ ] **Console:** Clear Vite cache, rebuild, hard refresh to drop 127.0.0.1 ingest errors if they persist; or test in incognito to see if it’s an extension.
