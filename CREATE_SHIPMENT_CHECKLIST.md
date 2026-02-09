# Create Shipment → Nimbuspost – Checklist When It’s Broken

Use this when Admin → Orders → "Create shipment" used to work but now fails or orders don’t appear in Nimbuspost.

## What changed? (It worked before, now "Missing or invalid Token")

Your logs show **success** earlier: `[NimbusPost] Shipment created for order: ORD-20260207-3226 weight_kg: 0.5`, then later **failures**: `[NimbusPost] Nimbus API error: Missing or invalid Token in request`. The code path is the same; Nimbuspost is **rejecting the token** on later requests.

So something changed on **config or Nimbuspost’s side**, not in the flow:

1. **Supabase secret was changed**  
   Someone may have edited **NIMBUS_API_KEY** (or it was recreated with a different value). The key must be the **Old API** key from [Nimbuspost → Settings → API](https://ship.nimbuspost.com) → "Your API Key" under **Old API Document**. If you use the New API email/password or a different key, Nimbuspost returns "Missing or invalid Token".

2. **Nimbuspost rotated or invalidated the key**  
   They may have regenerated keys or expired the old one. Fix: In Nimbuspost go to **Settings → API**, copy the current **Old API** "Your API Key", and in Supabase **Edge Functions → Secrets** set **NIMBUS_API_KEY** to that value (overwrite the old one). No redeploy needed after changing the secret.

3. **Auth format**  
   We send `Authorization: Bearer <key>` by default. If you still get "Missing or invalid Token", add secret **NIMBUS_AUTH_STYLE** = **token** so we send `Authorization: token=<key>` instead.

After you **redeploy** `push-order-to-nimbus`, the logs will show `auth_style: Bearer key_length: <number>` (or `token=` if you set NIMBUS_AUTH_STYLE=token). If `key_length` is 0, the secret is empty. If it’s non‑zero and you still get "Missing or invalid Token", try **NIMBUS_AUTH_STYLE** = **token**, or re‑copy the Old API key (no spaces/newlines) and update the secret.

**API reference:** [Nimbuspost Partners API (Postman)](https://documenter.getpostman.com/view/9692837/TW6wHnoz) — check their "Create Order" request for the exact Authorization header they expect.

---

## 1. Secrets (Supabase → Project Settings → Edge Functions → Secrets)

**Required for create-order (api.nimbuspost.com uses AWS gateway):** The create-order endpoint only accepts **AWS Signature Version 4**. You need **AWS credentials from Nimbuspost** (ask their support: "AWS Access Key ID and Secret for the Partners API / create order").

| Secret | Value | Notes |
|--------|--------|--------|
| **NIMBUS_AWS_ACCESS_KEY_ID** | AWS Access Key from Nimbuspost | **Required** for create-order (SigV4). |
| **NIMBUS_AWS_SECRET_ACCESS_KEY** | AWS Secret Key from Nimbuspost | **Required** for create-order (SigV4). |
| NIMBUS_AWS_REGION | `us-east-1` (default) | Region for SigV4; change if Nimbuspost specifies another. |
| **NIMBUSPOST_EMAIL** / **NIMBUSPOST_PASSWORD** | Dashboard login | Used for tracking/labels; create-order still needs SigV4 above. |
| **NIMBUS_API_KEY** | Old API key from Nimbuspost | Not used for create-order when gateway requires SigV4. |
| NIMBUS_API_ORDERS_PATH | `/v1/order` (default) | Override only if needed. |
| NIMBUS_API_BASE_URL | `https://api.nimbuspost.com` (default) | Partners API. |

**Also supported:** `NIMBUS_API_TOKEN` as fallback for `NIMBUS_API_KEY`.

## 2. Redeploy (only after code changes)

Changing secrets does **not** require redeploy. After changing function code:

```bash
npx supabase functions deploy create-nimbuspost-shipment --project-ref cfuwclyvoemrutrcgxeq
npx supabase functions deploy push-order-to-nimbus --project-ref cfuwclyvoemrutrcgxeq
```

## 3. Check Edge Function logs

Supabase → Edge Functions → **push-order-to-nimbus** → Logs.

- **"Not configured. Missing: NIMBUS_API_KEY"** → Set the secret (Old API key).
- **"Pushing order to ... auth_style: NP-API-KEY key_length: 0"** → Set **NIMBUS_API_KEY** (Nimbuspost → Settings → API → Generate API Key).
- **"Authorization header requires Credential / Signature / SignedHeaders"** (AWS SigV4) → The gateway only accepts AWS SigV4. Set **NIMBUS_AWS_ACCESS_KEY_ID** and **NIMBUS_AWS_SECRET_ACCESS_KEY** (get these from Nimbuspost support for the Partners API). Set **NIMBUS_AWS_REGION** if they specify one (default `us-east-1`). Then redeploy.
- **"Missing or invalid Token"** / **"Missing Authentication Token"** → Use login auth (see above), or set **NIMBUS_API_KEY** and redeploy.
- **"Order pushed successfully"** but order not in Nimbuspost → Check path (`NIMBUS_API_ORDERS_PATH`) or payload in Nimbuspost API doc.

## 4. Flow (for reference)

1. Admin → Orders → open order → click **Create shipment**.
2. Frontend calls **create-nimbuspost-shipment** with `order_id` (and/or `order_number`).
3. **create-nimbuspost-shipment** loads the order and `order_items` from the DB, builds payload, then calls **push-order-to-nimbus**.
4. **push-order-to-nimbus** uses **SigV4** when **NIMBUS_AWS_ACCESS_KEY_ID** and **NIMBUS_AWS_SECRET_ACCESS_KEY** are set: signs the request with AWS Signature V4 and POSTs to `https://api.nimbuspost.com/v1/order`. Otherwise tries login auth or API key (both may be rejected by the gateway).
5. Nimbuspost creates the order (Nimbuspost → Orders, CHANNEL: API). Use **Ship** in Nimbuspost to get AWB.

If anything in steps 3–5 fails (wrong token, wrong path, wrong payload), you’ll see an error in the admin UI or in the Edge Function logs.
