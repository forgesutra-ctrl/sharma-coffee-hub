# Push Order to Nimbus Post

This function sends each new order (with **weight** and full details) to Nimbus Post so orders appear in your Nimbus dashboard with correct weight.

**Official API reference:** [Nimbuspost Partners API (Postman)](https://documenter.getpostman.com/view/9692837/TW6wHnoz). The function defaults to **`https://api.nimbuspost.com`** (Partners API) and **`/v1/order`** with **POST**. If your Postman “Create Order” request uses a different path or method, set `NIMBUS_API_ORDERS_PATH` and/or `NIMBUS_API_METHOD` accordingly.

## Why weight was not showing in Nimbus

Previously the app had no Nimbus integration. Orders were never sent to Nimbus, so weight (and the order itself) did not transfer. This function pushes every order to Nimbus with `weight_kg` and per-item `weight` (grams) so Nimbus can display and use it.

## Setup

1. **Get Nimbus Post API credentials**
   - Log in to [Nimbus Post](https://ship.nimbuspost.com)
   - Go to **Settings** → **API**
   - Click **Generate API User Credentials**
   - Copy the API key / token

2. **Configure Supabase Edge Function secrets**
   - In Supabase Dashboard: **Project Settings** → **Edge Functions** → **Secrets**
   - Add **at least**:
     - `NIMBUS_API_KEY` – your API token from Nimbus Post **Settings → API → Generate API User Credentials**. The function sends it as `Authorization: token=<your_key>` (Partners API expects a key=value pair with an equal sign). Store the raw token; a `Bearer ` prefix is stripped and `token=` is used.
   - Optional (defaults work with [Nimbuspost Partners API](https://documenter.getpostman.com/view/9692837/TW6wHnoz)):
     - `NIMBUS_API_BASE_URL` – default **`https://api.nimbuspost.com`** (Partners API). If you had `https://ship.nimbuspost.com` set, remove it or change to `https://api.nimbuspost.com` so create-order works.
     - `NIMBUS_API_ORDERS_PATH` – default **`/v1/order`**. Override only if the Postman “Create Order” request shows a different path.
     - `NIMBUS_API_METHOD` – default **`POST`**.

3. **Deploy the function**
   ```bash
   npx supabase functions deploy push-order-to-nimbus
   ```

If `NIMBUS_API_BASE_URL` or `NIMBUS_API_KEY` is not set, the function does nothing (returns success without calling Nimbus), so the app keeps working. **If you click "Create shipment" in admin and the order does not appear in Nimbus Post**, add these two secrets in Supabase, then redeploy `push-order-to-nimbus`.

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
   - `[Nimbus] Pushing order to <url> weight_kg: X order_number: ORD-...` then `Order pushed successfully` (request reached Nimbus), or  
   - `Not configured. Missing: NIMBUS_API_KEY` (key not set), or  
   - `Push failed: 4xx/5xx` (Nimbus rejected the request; check the logged response body).

2. **If logs show "Order pushed successfully" but the response body is empty and the order never appears in Nimbus**  
   The default path we use is `/mapi/v1/order`. Nimbus may use a different “create order” endpoint. In **Nimbus Post → Settings → API**, look for official API documentation or a “create order” / “push order” endpoint URL. Set the secret **`NIMBUS_API_ORDERS_PATH`** to the path they specify (e.g. `/api/v1/order` or `/v1/orders`). If they provide a full sample request body, we may need to adjust the payload in `push-order-to-nimbus/index.ts` to match. You can also contact Nimbus Post support and ask for the exact “create B2C order via API” endpoint and payload format.

3. **If the order is missing or shows 0.00 kg in Nimbus**  
   The payload field names may not match. Check Nimbus’s API docs for the correct fields (e.g. `order_weight` instead of `weight_kg`) and we can adjust `index.ts` accordingly.
