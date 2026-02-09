# Nimbuspost secrets – step-by-step (non-tech)

Use this to fix "Create shipment" and get orders into Nimbuspost. Do the steps in order.

---

## Step 1: Open Supabase secrets

1. Go to **https://supabase.com/dashboard**
2. Open your project (Sharma Coffee – the one you use for this app)
3. In the left sidebar, click **Project Settings** (gear icon at the bottom)
4. Click **Edge Functions**
5. Find the **Secrets** section and click it so you see the table of secrets (NAME, DIGEST, UPDATED)

---

## Step 2: Remove NIMBUS_AUTH_STYLE (recommended)

We send **NP-API-KEY** and **Authorization: Bearer &lt;key&gt;** so the server gets a token. Having **NIMBUS_AUTH_STYLE** set can change the Authorization format and cause errors.

- In the secrets table, find the row where **NAME** is **NIMBUS_AUTH_STYLE**
- Click the **three dots (⋮)** on the right of that row → **Delete** → confirm

---

## Step 3: Check NIMBUS_API_KEY

- Find the row where **NAME** is **NIMBUS_API_KEY**
- The **value** must be exactly the API key from Nimbuspost (no spaces, no "Bearer ", no "token=")
- To get the key: log in to **Nimbuspost** → **Settings** → **API** → click **Generate API Key** (or copy "Your API Key" under Old API Document)
- If you’re not sure: click the three dots next to **NIMBUS_API_KEY** → **Edit** → paste the key again (copy from Nimbuspost, paste once), then **Save**

---

## Step 4: Optional – avoid confusion between two keys

You have both **NIMBUS_API_KEY** and **NIMBUS_API_TOKEN**. The code uses **NIMBUS_API_KEY** first. To avoid mix-ups:

- Either leave both as they are (we only use **NIMBUS_API_KEY**), or
- If you prefer one key: set that one in **NIMBUS_API_KEY**, and delete **NIMBUS_API_TOKEN** (three dots → Delete) so only one key is stored

---

## Step 5: Check the API URL (optional)

- Find **NIMBUS_API_BASE_URL**
- Its value should be: **https://api.nimbuspost.com** (no slash at the end)
- If it says something like `https://ship.nimbuspost.com`, edit it and change to **https://api.nimbuspost.com**, then Save

---

## Step 6: Do NOT add NIMBUS_API_ORDERS_PATH (or set it to /v1/order)

- If you have a secret named **NIMBUS_API_ORDERS_PATH**, its value must be **/v1/order**
- If you don’t have this secret, that’s fine – the app uses **/v1/order** by default
- Do **not** set it to **/v1/shipments** – that path often gives "Missing or invalid Token" with the same key

---

## Step 7: Redeploy the function (required after code changes)

The latest code sends **both** `NP-API-KEY` and `Authorization: Bearer <key>` so "Missing Authentication Token" is fixed. You **must** redeploy so this code runs.

1. On your computer, open **PowerShell** (or Command Prompt)
2. Go to your project folder:  
   `cd C:\Users\KB\sharma-coffee-hub-1`
3. Run:  
   `npx supabase functions deploy push-order-to-nimbus --project-ref cfuwclyvoemrutrcgxeq`
4. Wait until it says the function was deployed successfully

---

## Step 8: Test "Create shipment"

1. Open your app (e.g. **http://localhost:8082** or your live URL)
2. Log in as **Admin**
3. Go to **Admin** → **Orders**
4. Click one order to open its details
5. Click the **"Create shipment"** button (in the "Shipment (Nimbuspost)" section)
6. You should see a success message and no red error about Token or Authorization

---

## If it still fails

- In **Supabase Dashboard** → **Edge Functions** → click **push-order-to-nimbus** → open **Logs**
- Look at the latest lines when you clicked "Create shipment"
- You should see something like:  
  `[Nimbus] Pushing order to https://api.nimbuspost.com/v1/order ... auth_style: NP-API-KEY key_length: 46`
- If **key_length** is **0**, the **NIMBUS_API_KEY** secret is empty – repeat Step 3
- If you see an error line, copy that line and share it so we can fix the next step

---

## Summary of what should be in Secrets

| Secret name              | What to do |
|--------------------------|------------|
| **NIMBUS_API_KEY**       | Keep; value = your Nimbuspost API key only |
| **NIMBUS_AUTH_STYLE**    | **Delete** (so we send only NP-API-KEY) |
| **NIMBUS_API_BASE_URL**  | Keep; value = `https://api.nimbuspost.com` |
| **NIMBUS_API_METHOD**    | Optional; can keep or delete (default is POST) |
| **NIMBUS_API_TOKEN**     | Optional; can delete to avoid confusion (we use NIMBUS_API_KEY) |
| **NIMBUSPOST_EMAIL** / **NIMBUSPOST_PASSWORD** / **NIMBUSPOST_TRACKING_DOMAIN** | Used by other features (e.g. tracking); leave as is |
