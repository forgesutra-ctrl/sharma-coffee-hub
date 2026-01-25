# Staff Access to Orders and Customers

## Date: January 25, 2026

This document outlines the changes made to allow staff accounts to access Orders and Customers pages with the same permissions as Admin.

---

## Changes Made

### 1. Frontend Changes

#### AdminLayout Component (`src/components/admin/AdminLayout.tsx`)
- ✅ Updated `allSidebarLinks` to set `staffAllowed: true` for Orders and Customers
- ✅ Updated `isRouteAccessible()` to include `/admin/orders` and `/admin/customers` for staff

#### New Component: AdminOrStaffOnly (`src/components/admin/AdminOrStaffOnly.tsx`)
- ✅ Created new component that allows both admin and staff access
- ✅ Redirects regular users to home page
- ✅ Replaces SuperAdminOnly for Orders and Customers pages

#### OrdersPage (`src/pages/admin/OrdersPage.tsx`)
- ✅ Replaced `SuperAdminOnly` wrapper with `AdminOrStaffOnly`
- ✅ Staff can now view all orders
- ✅ Staff can update order status (via existing RLS policies)

#### CustomersPage (`src/pages/admin/CustomersPage.tsx`)
- ✅ Replaced `SuperAdminOnly` wrapper with `AdminOrStaffOnly`
- ✅ Staff can now view all customer data

### 2. Database Changes

#### New Migration: `20260125000001_add_staff_customer_access.sql`
- ✅ Added RLS policy: "Staff can view all profiles"
- ✅ Added RLS policy: "Staff can update profiles"
- ✅ Added RLS policy: "Staff can view all customer addresses"
- ✅ Added RLS policy: "Staff can update customer addresses"
- ✅ Added RLS policy: "Staff can view customer segments"

---

## Staff Permissions Summary

### ✅ Staff Can Now Access:

1. **Orders Page** (`/admin/orders`)
   - View all orders (one-time and subscription)
   - View order details
   - Update order status
   - View order items
   - Filter and search orders

2. **Customers Page** (`/admin/customers`)
   - View all customer profiles
   - View customer details (name, email, phone)
   - View customer addresses
   - View customer segments
   - View customer order history
   - Update customer profiles (for customer service)

3. **Operations Page** (`/admin/operations`) - Already had access
   - View orders with customer details
   - Manage inventory
   - Handle shipping escalations

4. **Shipping Page** (`/admin/shipping`) - Already had access
   - View shipments
   - Create shipping labels
   - Track shipments

### ❌ Staff Still Cannot Access:

- Dashboard (analytics)
- Products (product management)
- Categories (category management)
- Promotions (promotion management)
- Reports (financial reports)

---

## RLS Policies

### Orders Table
- ✅ Staff can view all orders (existing policy)
- ✅ Staff can update order status (existing policy)

### Order Items Table
- ✅ Staff can view all order items (existing policy)

### Profiles Table
- ✅ Staff can view all profiles (NEW)
- ✅ Staff can update profiles (NEW)

### Customer Addresses Table
- ✅ Staff can view all customer addresses (NEW)
- ✅ Staff can update customer addresses (NEW)

### Customer Segments Table
- ✅ Staff can view customer segments (NEW)

---

## Deployment Steps

### Step 1: Deploy Database Migration
```sql
-- Run in Supabase SQL Editor:
-- supabase/migrations/20260125000001_add_staff_customer_access.sql
```

### Step 2: Verify Frontend Changes
- The frontend changes are already in place
- No deployment needed (changes are in source code)

### Step 3: Test Staff Access
1. Login as staff account
2. Verify Orders appears in sidebar
3. Verify Customers appears in sidebar
4. Test viewing orders
5. Test updating order status
6. Test viewing customer details
7. Test viewing customer addresses

---

## Verification Queries

### Test Staff Can View Profiles
```sql
-- As staff user, should return all profiles
SELECT COUNT(*) FROM profiles;
```

### Test Staff Can View Customer Addresses
```sql
-- As staff user, should return all addresses
SELECT COUNT(*) FROM customer_addresses;
```

### Test Staff Can View Orders
```sql
-- As staff user, should return all orders
SELECT COUNT(*) FROM orders;
```

---

## Security Notes

1. **RLS Enforcement**: All access is enforced at the database level via RLS policies
2. **No Data Exposure**: Staff cannot access sensitive admin features (products, reports, etc.)
3. **Update Permissions**: Staff can update orders and customer data for operational purposes
4. **Read-Only Access**: Staff cannot delete orders or customer data (only super_admin can)

---

## Expected Behavior

After deployment:

✅ **Staff sees Orders and Customers in sidebar**
✅ **Staff can navigate to Orders page**
✅ **Staff can navigate to Customers page**
✅ **Staff can view all orders and update status**
✅ **Staff can view all customer data**
✅ **Staff can update customer profiles**
✅ **All permissions match Admin for Orders and Customers tabs**

---

## Rollback

If issues occur:

1. **Revert Frontend**: Remove `staffAllowed: true` from Orders and Customers in AdminLayout
2. **Revert Pages**: Replace `AdminOrStaffOnly` with `SuperAdminOnly` in OrdersPage and CustomersPage
3. **Revert Database**: Drop the new RLS policies from the migration

---

## Notes

- Staff permissions for Orders and Customers now match Admin exactly
- Staff still cannot access other admin-only features (Dashboard, Products, etc.)
- All changes are backward compatible
- Existing admin permissions are unchanged
