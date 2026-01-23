# Admin Dashboard Orders Sync

## Overview
Enhanced the admin dashboard to properly display all orders - both one-time orders and subscription orders.

## Changes Made

### 1. Enhanced Orders Page (`src/pages/admin/OrdersPage.tsx`)

**Improvements:**
- ✅ Added refresh button to manually sync orders
- ✅ Added order type column to distinguish between one-time and subscription orders
- ✅ Added order type filter (All Types / One-time / Subscription)
- ✅ Added order count summary showing breakdown of subscription vs one-time orders
- ✅ Improved error handling with detailed error messages
- ✅ Added console logging to track order fetching

**Features:**
- **Order Type Badge**: Each order now shows whether it's a "Subscription" or "One-time" order
- **Order Type Filter**: Filter orders by type (All / One-time / Subscription)
- **Summary Statistics**: Shows total orders with breakdown (e.g., "50 orders found (12 subscription, 38 one-time)")
- **Refresh Button**: Manual refresh to sync latest orders from database

### 2. Order Detection Logic

Orders are classified as subscription orders if their `order_number` starts with `SUB-`, which is the pattern used by the `razorpay-subscription-webhook` function when creating subscription orders.

## How Orders Are Created

### One-Time Orders
- Created via `verify-razorpay-payment` Edge Function
- Order number format: `ORD-YYYYMMDD-XXXX`
- Stored in `orders` table with `payment_type` = "prepaid" or "cod"

### Subscription Orders
- Created via `razorpay-subscription-webhook` Edge Function
- Triggered when `subscription.charged` event occurs
- Order number format: `SUB-{timestamp}-{random}`
- Stored in `orders` table with `payment_type` = "prepaid"
- Linked to `user_subscriptions` via `user_id`

## RLS Policies

The following RLS policies ensure admins can view all orders:

1. **Super admins can view all orders** - Allows super_admin role to see all orders
2. **Staff can view orders** - Allows staff, admin, and super_admin roles to see all orders
3. **Users can view own orders** - Allows customers to see only their orders

## Testing Checklist

- [ ] Verify all one-time orders appear in admin dashboard
- [ ] Verify all subscription orders appear in admin dashboard
- [ ] Test order type filter (All / One-time / Subscription)
- [ ] Test status filter
- [ ] Test search functionality
- [ ] Test refresh button
- [ ] Verify order counts match database
- [ ] Check that order details dialog shows correct information

## Troubleshooting

If orders are not appearing:

1. **Check RLS Policies**: Ensure admin user has `super_admin`, `admin`, or `staff` role
2. **Check Console Logs**: Look for "✅ Fetched X orders from database" message
3. **Check Database**: Verify orders exist in `orders` table
4. **Check Order Numbers**: Subscription orders should start with `SUB-`
5. **Refresh Manually**: Use the refresh button to reload orders

## Next Steps

1. Monitor order creation to ensure all orders (one-time and subscription) are being created
2. Verify subscription webhook is firing correctly when subscriptions are charged
3. Consider adding order export functionality
4. Consider adding date range filters for better order management
