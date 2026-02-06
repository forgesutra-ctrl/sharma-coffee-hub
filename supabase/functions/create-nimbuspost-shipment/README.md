# create-nimbuspost-shipment

Creates a Nimbus Post shipment for an order by **order_id** or **order_number**.

This function does **not** call Nimbus Post's API directly. It:
1. Fetches the order and order items from the database (with weight).
2. Calls the **push-order-to-nimbus** edge function, which pushes the order to Nimbus (if `NIMBUS_API_BASE_URL` and `NIMBUS_API_KEY` are set).

So you must deploy **this repo's version** of this function. If an older/different version is deployed that calls Nimbus Post's API directly, you may see **"No autoship rule found"** (a Nimbus dashboard configuration requirement for that API).

## Deploy

From the project root:

```bash
npx supabase functions deploy create-nimbuspost-shipment --project-ref YOUR_PROJECT_REF
```

Example:

```bash
npx supabase functions deploy create-nimbuspost-shipment --project-ref cfuwclyvoemrutrcgxeq
```

Ensure **push-order-to-nimbus** is also deployed and that Nimbus is configured via Edge Function secrets (`NIMBUS_API_BASE_URL`, `NIMBUS_API_KEY`) if you want orders to actually appear in Nimbus.
