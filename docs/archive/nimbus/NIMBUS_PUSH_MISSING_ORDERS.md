# Push Missing Orders to Nimbuspost

## Why some orders weren’t on Nimbuspost

A bug in the payment flow was fixed:

- After payment verification, the code was calling `pushToNimbus()` (which didn’t exist) instead of `createShipment()`.
- The request body was using a wrong variable name (`nimbusPayload` instead of `shipmentPayload`).

**Result:** New paid orders were not being sent to Nimbuspost automatically.

**Fix applied:** `verify-razorpay-payment` now calls `createShipment()` and sends the correct payload. After you **redeploy** the edge function, **new** orders will be pushed to Nimbuspost when payment is verified.

---

## Push your existing orders (e.g. the 7 you listed)

For orders that are already in your system but not on Nimbuspost, create the shipment from the admin UI:

1. Open **Admin** → **Orders** (or **Admin** → **Shipping**).
2. Find the order (e.g. `ORD-20260209-8111`, `ORD-20260209-6599`, …).
3. Select the order (click the row or open details).
4. Click **“Create Shipment”** (or **“Create Nimbuspost shipment”**).
5. Repeat for each of the 7 orders.

That uses the `create-nimbuspost-shipment` edge function, which loads the order from the DB and pushes it to Nimbuspost (via `push-order-to-nimbus`).

---

## Where to find orders in Nimbuspost (Orders vs Shipments)

Our integration calls Nimbuspost’s **“Create Order”** API. That creates an **order** in Nimbuspost; it does **not** book a courier or generate an AWB by itself.

- **Where they appear:** In Nimbuspost go to **Orders** (not a separate “Shipments” screen). Orders from your site show with **CHANNEL: API**. Use the **“All Orders”** or **“Not Shipped”** tab; filter by date if needed (e.g. 2026/02/07 for ORD-20260207-3226).
- **Why “Fulfilled orders (0)”:** “Fulfilled” in Nimbuspost means the order has been **shipped** (courier booked, AWB generated). Our API only creates the order; to get an AWB you need to click the blue **“Ship”** button for that order in Nimbuspost (or use their bulk Ship). Until you do that, orders stay in “Not Shipped” and fulfilled count stays 0.
- **Summary:** “Create Shipment” in our admin = **push order to Nimbuspost** so it appears in **Orders**. To get a real shipment (AWB, label), use **Ship** in Nimbuspost for that order.

---

## Fix "Missing or invalid Token in request"

Your app uses Nimbuspost’s **Old API** (separate endpoints for orders/shipments). The token must be the **Old API** key, not the New API email/password.

1. In Nimbuspost go to **Settings** → **API** (or **user_api**). Find the **"Old API Document"** section.
2. Copy **"Your API Key"** (the long hex string, e.g. `8b9f6a12...`). Do **not** use the email/password from "New API Document (Recommended)".
3. In **Supabase** → your project → **Project Settings** → **Edge Functions** → **Secrets**, set **`NIMBUS_API_KEY`** to that exact key (no spaces, no `Bearer ` prefix).
4. If you still get "Missing or invalid Token", add secret **`NIMBUS_AUTH_STYLE`** = **`Bearer`** so we send `Authorization: Bearer <key>` instead of `token=<key>`.

No redeploy needed after changing secrets; try **Create Shipment** again.

---

## Make sure Nimbuspost is configured

If “Create Shipment” fails or orders still don’t appear in Nimbuspost:

1. In **Supabase Dashboard** → your project → **Project Settings** → **Edge Functions** → **Secrets**, set:
   - **`NIMBUS_API_KEY`** – from Nimbus Post → Settings → API → Generate API User Credentials.
   - Optionally **`NIMBUS_API_BASE_URL`** (default `https://api.nimbuspost.com`).
2. Redeploy the functions that use Nimbus:
   ```bash
   npx supabase functions deploy push-order-to-nimbus
   npx supabase functions deploy create-nimbuspost-shipment
   npx supabase functions deploy verify-razorpay-payment
   ```

---

## Orders you listed

| Order number         | Customer        | Date   | Status   | Amount  |
|----------------------|-----------------|--------|----------|---------|
| ORD-20260209-8111    | Deeksha Parmar  | 9 Feb  | confirmed| ₹340    |
| ORD-20260209-6599    | Dimple Chitroda | 9 Feb  | confirmed| ₹1,890  |
| ORD-20260209-1968    | Prasath Kumar P | 9 Feb  | confirmed| ₹1,900  |
| ORD-20260209-3102    | Raja Venkatesh  | 9 Feb  | confirmed| ₹960    |
| ORD-20260208-7481    | Ganesh Iyer     | 8 Feb  | confirmed| ₹1,960  |
| ORD-20260207-0721    | Siddharth M     | 7 Feb  | shipped | ₹1,030  |
| ORD-20260207-3226    | V Ramesh        | 7 Feb  | shipped | ₹550    |

Create a shipment for each of these from Admin → Orders (or Shipping) as above.
