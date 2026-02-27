# Fix: Admin/Staff Login + Customers Not Seeing Products

## Quick Fix

1. Open **Supabase Dashboard** → **SQL Editor** → **New query**
2. Copy and paste the contents of `scripts/diagnose-and-fix-login-products.sql`
3. Click **Run**

The script will:
- Fix admin/staff roles so they can log in
- Ensure products, categories, variants, and images are visible to all customers

---

## What Was Wrong

### Admin/Staff Login
- **Cause:** Missing or incorrect rows in `user_roles`
- **Fix:** Upserts correct roles for `ask@sharmacoffeeworks.com` (super_admin) and `sharmacoffeeoffice@gmail.com` (staff)

### Customers Not Seeing Products
- **Cause:** Public SELECT policies on `products`, `categories`, `product_variants`, or `product_images` may have been dropped or never applied
- **Fix:** Recreates "viewable by everyone" policies so anonymous and logged-in customers can see products

---

## After Running

1. **Admin/Staff:** Try logging in at `/admin/login` or `/login`
2. **Customers:** Ask the three affected customers to hard-refresh (Ctrl+Shift+R or Cmd+Shift+R) and try again

---

## If Issues Persist

- **Admin login:** Check browser console for errors; ensure no typos in email/password
- **Products:** Run the diagnostic queries (Part 1) and share the output to debug further
