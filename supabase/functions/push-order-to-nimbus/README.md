# Push Order to Nimbus Post

This function sends each new order (with **weight** and full details) to Nimbus Post so orders appear in your Nimbus dashboard with correct weight.

**Official API reference:** [Nimbuspost Partners API (Postman)](https://documenter.getpostman.com/view/9692837/TW6wHnoz). The function defaults to **`https://api.nimbuspost.com`** (Partners API) and **`/v1/order`** with **POST**. If your Postman “Create Order” request uses a different path or method, set `NIMBUS_API_ORDERS_PATH` and/or `NIMBUS_API_METHOD` accordingly.

## Auth (priority order)

- **SigV4 (required for api.nimbuspost.com create-order):** The gateway only accepts **AWS Signature Version 4**. Set **`NIMBUS_AWS_ACCESS_KEY_ID`** and **`NIMBUS_AWS_SECRET_ACCESS_KEY`** (get these from Nimbuspost support for the Partners API). Optional: **`NIMBUS_AWS_REGION`** (default `us-east-1`). We sign the request with SigV4 and POST to `/v1/order`.
- **Login auth:** **`NIMBUSPOST_EMAIL`** and **`NIMBUSPOST_PASSWORD`**. May still get 403 SigV4 from the gateway — use SigV4 above.
- **API key:** **`NIMBUS_API_KEY`**. Same gateway often requires SigV4.

## Why weight was not showing in Nimbus

Previously the app had no Nimbus integration. Orders were never sent to Nimbus, so weight (and the order itself) did not transfer. This function pushes every order to Nimbus with `weight_kg` and per-item `weight` (grams) so Nimbus can display and use it.

## Setup

1. **SigV4 (required):** Ask Nimbuspost for AWS Access Key ID and Secret for the Partners API. Set **NIMBUS_AWS_ACCESS_KEY_ID**, **NIMBUS_AWS_SECRET_ACCESS_KEY**, and optionally **NIMBUS_AWS_REGION** in Edge Function secrets.

2. **Configure Supabase Edge Function secrets**
   - In Supabase Dashboard: **Project Settings** → **Edge Functions** → **Secrets**
   - Add **at least**:
     - `NIMBUS_API_KEY` – your API token (use the **Old API** key from Nimbus Post **Settings → API → “Your API Key”** under Old API Document). Store the raw key only. The function sends **`NP-API-KEY: <key>`** and **`Authorization: ApiKey api_key=<key>`** by default (gateway requires both). Optional: **`NIMBUS_AUTH_STYLE`** = **`bearer`** or **`token`** to use a different Authorization format.
   - Optional (defaults work with [Nimbuspost Partners API](https://documenter.getpostman.com/view/9692837/TW6wHnoz)):
     - `NIMBUS_API_BASE_URL` – default **`https://api.nimbuspost.com`** (Partners API). If you had `https://ship.nimbuspost.com` set, remove it or change to `https://api.nimbuspost.com` so create-order works.
     - `NIMBUS_API_ORDERS_PATH` – default **`/v1/order`**. Override only if the Postman “Create Order” request shows a different path.
     - `NIMBUS_API_METHOD` – default **`POST`**.

3. **Deploy the function**
   ```bash
   npx supabase functions deploy push-order-to-nimbus
   ```

If none of SigV4, login auth, or API key is set, the function does nothing. **If you see "Authorization header requires Credential / Signature / SignedHeaders"**, you must use **SigV4**: set **`NIMBUS_AWS_ACCESS_KEY_ID`** and **`NIMBUS_AWS_SECRET_ACCESS_KEY`** (ask Nimbuspost for AWS credentials for the Partners API), then redeploy.

## Payload we send (current)

- `order_id`, `order_number`, `weight_kg`, `weight`, `length_cm`, `width_cm`, `height_cm`
- `consignee_name`, `consignee_phone`, `consignee_email`, `consignee_address`, `consignee_pincode`, `consignee_city`, `consignee_state`
- `payment_type`, `cod_amount`, `order_amount`
- `items[]`: `product_name`, `quantity`, `unit_price`, `total_price`, `weight` (grams)

If the [Partners API](https://documenter.getpostman.com/view/9692837/TW6wHnoz) “Create Order” request uses different field names (e.g. `order_weight` instead of `weight_kg`, or nested `consignee` object), we need to change the payload in `index.ts` to match. Share the request body sample from the doc if you want it aligned.

## Flow

After payment is verified and the order is created in your database, `verify-razorpay-payment` calls this function with the same order data (including weight). This function then POSTs to Nimbus so the order appears in your Nimbus Post dashboard with weight.

## Troubleshooting: "Shipment created" but order not in Nimbus

1. **Check Edge Function logs**  
   Supabase Dashboard → **Edge Functions** → **push-order-to-nimbus** → **Logs**. You should see either:
   - `[Nimbus] Pushing order (login auth) to ...` or `[Nimbus] Pushing order to <url> ...` then `Order pushed successfully`, or  
   - `Not configured. Missing: ...` (set `NIMBUSPOST_EMAIL` + `NIMBUSPOST_PASSWORD` for login auth, or `NIMBUS_API_KEY` for API key), or  
   - `Push failed: 4xx/5xx` (check the logged response body).

2. **If logs show "Order pushed successfully" but the response body is empty and the order never appears in Nimbus**  
   The default path we use is **`/v1/order`** (override with `NIMBUS_API_ORDERS_PATH` if your Nimbus doc says e.g. `/v1/shipments`). Nimbus may use a different “create order” endpoint. In **Nimbus Post → Settings → API**, look for official API documentation or a “create order” / “push order” endpoint URL. Set the secret **`NIMBUS_API_ORDERS_PATH`** to the path they specify (e.g. `/api/v1/order` or `/v1/orders`). If they provide a full sample request body, we may need to adjust the payload in `push-order-to-nimbus/index.ts` to match. You can also contact Nimbus Post support and ask for the exact “create B2C order via API” endpoint and payload format.

3. **If the order is missing or shows 0.00 kg in Nimbus**  
   The payload field names may not match. Check Nimbus’s API docs for the correct fields (e.g. `order_weight` instead of `weight_kg`) and we can adjust `index.ts` accordingly.

4. **"Authorization header requires 'Credential' / 'Signature' / 'SignedHeaders'"** (AWS SigV4)  
   Use **login auth** instead of API key: set **`NIMBUSPOST_EMAIL`** and **`NIMBUSPOST_PASSWORD`** in Edge Function secrets (same as for tracking/labels). Redeploy. You can leave or remove **`NIMBUS_API_KEY`** when using login auth for create-order.

5. **"Missing or invalid Token in request"** (when using API key)  
   Regenerate the key in Nimbus Post → **Settings** → **API**, update **`NIMBUS_API_KEY`**, or switch to login auth (see above).
