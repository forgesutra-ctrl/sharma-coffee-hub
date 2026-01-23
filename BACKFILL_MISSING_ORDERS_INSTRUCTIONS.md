# Instructions: Backfill Missing Orders

## Problem
3 payments were captured in Razorpay but orders were not created in Supabase:
- **₹840** - Preethi Sudhar (order_S79HGNQMjgTa09)
- **₹1,300** - Sourav Ghosh (order_S6vr5AUI9uWcsn)
- **₹990** - Anna George (order_S6utVpm2FjCW7O)

## Solution
Run the SQL script `scripts/backfill-missing-orders.sql` in Supabase SQL Editor to create these orders.

## Steps

### Step 1: Run the SQL Script
1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file `scripts/backfill-missing-orders.sql`
3. Copy and paste the entire script into SQL Editor
4. Click **Run** (or press Ctrl+Enter)

The script will:
- ✅ Check if customers exist in database
- ✅ Create the 3 missing orders with customer name, email, phone
- ✅ Verify orders were created successfully

### Step 2: Update Shipping Addresses (Optional)
After the orders are created, if you have the complete shipping addresses, you can update them:

1. Contact the customers to get their full addresses, OR
2. Check your shipping records/WhatsApp messages

Then run these UPDATE statements in Supabase SQL Editor:

```sql
-- Update Preethi Sudhar's address (₹840)
UPDATE public.orders
SET shipping_address = jsonb_build_object(
  'fullName', 'Preethi Sudhar',
  'email', 'preethisudhar@gmail.com',
  'phone', '+919940010785',
  'addressLine1', 'FULL ADDRESS LINE 1 HERE',
  'addressLine2', 'FULL ADDRESS LINE 2 HERE (if any)',
  'city', 'CITY NAME',
  'state', 'STATE NAME',
  'pincode', 'PINCODE',
  'landmark', 'LANDMARK IF ANY'
)
WHERE razorpay_order_id = 'order_S79HGNQMjgTa09';

-- Update Sourav Ghosh's address (₹1,300)
UPDATE public.orders
SET shipping_address = jsonb_build_object(
  'fullName', 'Sourav Ghosh',
  'email', 'sourav.ghosh2006@gmail.com',
  'phone', '+917718033203',
  'addressLine1', 'FULL ADDRESS LINE 1 HERE',
  'addressLine2', 'FULL ADDRESS LINE 2 HERE (if any)',
  'city', 'CITY NAME',
  'state', 'STATE NAME',
  'pincode', 'PINCODE',
  'landmark', 'LANDMARK IF ANY'
)
WHERE razorpay_order_id = 'order_S6vr5AUI9uWcsn';

-- Update Anna George's address (₹990)
UPDATE public.orders
SET shipping_address = jsonb_build_object(
  'fullName', 'Anna George',
  'email', 'annageorge@baselius.ac.in',
  'phone', '+919495109102',
  'addressLine1', 'FULL ADDRESS LINE 1 HERE',
  'addressLine2', 'FULL ADDRESS LINE 2 HERE (if any)',
  'city', 'CITY NAME',
  'state', 'STATE NAME',
  'pincode', 'PINCODE',
  'landmark', 'LANDMARK IF ANY'
)
WHERE razorpay_order_id = 'order_S6utVpm2FjCW7O';
```

### Step 3: Verify in Admin Panel
1. Go to **Admin → Orders** in your website
2. You should now see **6 orders** instead of 3:
   - ₹940 (Priya Iyer) ✅
   - ₹840 (Preethi Sudhar) ✅ **NEW**
   - ₹510 (Jagannath) ✅
   - ₹920 (Kirthi) ✅
   - ₹1,300 (Sourav Ghosh) ✅ **NEW**
   - ₹990 (Anna George) ✅ **NEW**

3. Click the **eye icon** on each order to see:
   - Customer name (should show instead of "N/A")
   - Customer email and phone
   - Shipping address (once you update it in Step 2)

## What's Fixed Going Forward

With the latest code changes:
- ✅ All new orders will **always** create matching rows in Supabase
- ✅ Customer details will be **fully visible** in admin panel
- ✅ No more missing orders from successful payments

## Notes

- The orders are created with **placeholder addresses** ("Address to be confirmed")
- You can update the addresses later using the UPDATE statements above
- If you know what products were ordered, you can also create `order_items` entries (optional)
- The orders will show **customer name, email, and phone** immediately after running the script
