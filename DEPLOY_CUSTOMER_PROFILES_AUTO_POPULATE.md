# Auto-Populate Customer Profiles from Orders

## Date: January 25, 2026

This document outlines the changes made to automatically populate customer profiles from order data.

---

## Problem

The Customers page in the admin section only showed customers who had profiles in the `profiles` table. Many customers who placed orders (especially guest orders) didn't have profiles, so they weren't visible in the admin panel.

---

## Solution

### 1. Database Migration: Auto-Populate Profiles

**File:** `supabase/migrations/20260125000003_auto_populate_customer_profiles.sql`

**What it does:**
- ✅ Creates a trigger function that automatically creates/updates profiles when orders are placed
- ✅ Extracts customer information from `shipping_address` JSONB field
- ✅ Handles both authenticated users (with `user_id`) and guest orders
- ✅ Backfills existing orders to create profiles for all past customers

**Key Features:**
- **For authenticated users**: Updates profile with order data if email/phone/name is missing
- **For guest orders**: Creates profiles based on email address
- **Handles multiple field name formats**: Supports `fullName`, `full_name`, `customerName`, etc.
- **Prevents duplicates**: Uses email as unique identifier for guest customers

### 2. Frontend Update: CustomersPage

**File:** `src/pages/admin/CustomersPage.tsx`

**What it does:**
- ✅ Fetches customers from both `profiles` table AND `orders` table
- ✅ Extracts customer info from `shipping_address` for guest orders
- ✅ Shows all customers who have placed orders, not just those with profiles
- ✅ Displays guest customers with a "Guest" badge
- ✅ Shows complete customer information (name, email, phone, address)

**Key Changes:**
- Fetches all orders and extracts customer data from `shipping_address`
- Creates customer entries for guest orders based on email
- Merges profile data with order data
- Sorts customers by most recent order

---

## Deployment Steps

### Step 1: Run Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- File: supabase/migrations/20260125000003_auto_populate_customer_profiles.sql
```

**Note:** The migration includes:
1. Function creation
2. Trigger creation
3. Backfill for existing orders
4. Verification queries

### Step 2: Verify Migration

After running the migration, check:

```sql
-- Check how many profiles were created
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
  COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as with_name,
  COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as with_phone
FROM public.profiles;

-- Check if all orders have corresponding profiles
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as authenticated_orders,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as guest_orders
FROM public.orders;
```

### Step 3: Test Frontend

1. Go to Admin → Customers
2. Verify all customers who have placed orders are visible
3. Check that customer information (name, email, phone) is populated
4. Verify guest customers show with "Guest" badge

---

## What Gets Populated

### From Orders (shipping_address JSONB):

- **Email**: `email`, `Email`, `customerEmail`
- **Phone**: `phone`, `Phone`, `phoneNumber`, `customerPhone`
- **Name**: `fullName`, `full_name`, `customerName`, `name`

### Profile Fields Updated:

- `email` - From order shipping_address
- `full_name` - From order shipping_address
- `phone` - From order shipping_address
- `updated_at` - Set to current timestamp

---

## How It Works

### For New Orders:

1. **Order is created** → Trigger fires
2. **Function extracts data** from `shipping_address` JSONB
3. **If user_id exists**: Updates existing profile or creates one
4. **If guest order**: Creates profile based on email (or updates if email exists)
5. **Profile is ready** for admin panel display

### For Existing Orders:

1. **Migration backfills** all existing orders
2. **Creates profiles** for orders with user_id but no profile
3. **Creates profiles** for guest orders based on email
4. **All customers** are now visible in admin panel

---

## Expected Results

### Before:
- Only customers with profiles in `profiles` table visible
- Many customers who placed orders not shown
- Missing customer information

### After:
- ✅ All customers who have placed orders are visible
- ✅ Customer information auto-populated from orders
- ✅ Guest customers shown with "Guest" badge
- ✅ Complete customer details (name, email, phone, address)
- ✅ Order history for each customer

---

## Verification

After deployment, check:

1. **Admin → Customers page** shows all customers who have orders
2. **Customer information** is populated (name, email, phone)
3. **Guest customers** are marked with "Guest" badge
4. **Order count** matches actual orders
5. **Customer details dialog** shows complete information

---

## Notes

- Guest customers are identified by email address
- If multiple guest orders have the same email, they're grouped as one customer
- Profiles are automatically updated when new orders are placed
- The trigger ensures real-time profile updates for future orders
