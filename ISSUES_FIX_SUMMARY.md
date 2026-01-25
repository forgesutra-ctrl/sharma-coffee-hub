# Issues Fix Summary

## Date: January 25, 2026

This document summarizes the fixes applied for three critical issues:

---

## Issue 1: Missing Orders in Admin Dashboard

### Problem
Some orders placed by customers are not showing up in the admin dashboard, even though payments were successful.

### Root Causes Identified
1. Orders might be created without proper `user_id` validation
2. RLS policies might be blocking visibility
3. Orders might have missing `order_number` or other required fields
4. Orders might be created but not properly linked to order_items

### Fixes Applied
1. **Created Diagnostic Script**: `scripts/diagnose-missing-orders.sql`
   - Checks for orders without user_id
   - Identifies orders with missing order_number
   - Finds orders without order_items
   - Lists orders with invalid user_id references
   - Provides summary statistics

### How to Use
1. Run `scripts/diagnose-missing-orders.sql` in Supabase SQL Editor
2. Review the results to identify missing orders
3. Check the edge function logs (`verify-razorpay-payment`) for any errors during order creation
4. Verify RLS policies are correctly configured (they should be based on existing migrations)

### Next Steps
- Review diagnostic script results
- Check edge function logs for order creation failures
- Verify all orders have proper user_id and order_number
- If orders exist but aren't visible, check RLS policies

---

## Issue 2: Subscription Model - Only 1000g Variants

### Problem
Currently, all variants (250g, 500g, 1000g) can be selected for subscriptions. The requirement is that ONLY 1000g variants should be available for subscriptions.

### Fixes Applied

#### 1. ProductDetail.tsx
- **Variant Filtering**: Added logic to filter variants based on purchase type
  - For subscriptions: Only show 1000g variants
  - For one-time purchases: Show all variants
- **Default Weight Selection**: Updated to auto-select 1000g when subscription is selected
- **UI Updates**: 
  - Added message indicating only 1000g variants are available for subscriptions
  - Disabled subscription option if no 1000g variant exists
  - Auto-selects 1000g variant when switching to subscription mode
- **Validation**: Added validation to prevent non-1000g variants from being added as subscriptions

#### 2. Checkout.tsx
- **Pre-checkout Validation**: Added validation before processing subscription orders
  - Checks all subscription items are 1000g variants
  - Shows error message if invalid items found
  - Prevents checkout if validation fails

#### 3. CartContext.tsx
- **Cart Validation**: Added validation in `addToCart` function
  - Prevents adding non-1000g variants as subscriptions
  - Logs error if attempt is made

### Changes Made
```typescript
// ProductDetail.tsx
- Filter variants: availableVariants = subscription ? variants.filter(v => v.weight === 1000) : variants
- Auto-select 1000g when subscription is selected
- Show message: "Only 1000g (1kg) variants are available for subscriptions"
- Validate before adding to cart

// Checkout.tsx
- Validate all subscription items are 1000g before processing
- Show error if invalid items found

// CartContext.tsx
- Prevent adding non-1000g variants as subscriptions
```

### Testing
1. Go to a product page
2. Select "Subscribe" option
3. Verify only 1000g variant is shown
4. Try to add 250g or 500g as subscription - should fail
5. Add 1000g variant as subscription - should work
6. Checkout with subscription - should process successfully

---

## Issue 3: Staff Access to Customer Details

### Problem
Staff members cannot view customer details (name, phone, address) when logged in through staff accounts.

### Root Cause Analysis
Customer details are stored in `shipping_address` JSON field in the `orders` table. Staff already have access to view orders via RLS policies (`Staff can view orders`), so they should be able to see the `shipping_address` field.

The issue might be:
1. Inconsistent field naming (full_name vs fullName, address_line1 vs addressLine1)
2. Missing data in shipping_address field
3. Frontend not handling both field name formats

### Fixes Applied

#### 1. OperationsPage.tsx
- **Improved Field Handling**: Updated to handle both camelCase and snake_case field names
  - `full_name` or `fullName`
  - `address_line1` or `addressLine1`
  - `address_line2` or `addressLine2`
- **Enhanced Display**: 
  - Shows customer name in orders table (handles both formats)
  - Displays full customer details in order details dialog
  - Shows phone and email if available
  - Better formatting and spacing

#### 2. Diagnostic Script
- **Created**: `scripts/fix-staff-customer-details-access.sql`
  - Verifies RLS policies for orders
  - Checks shipping_address field population
  - Identifies field naming inconsistencies
  - Provides sample data structure

### Changes Made
```typescript
// OperationsPage.tsx
- Customer name: (shipping_address as any)?.full_name || (shipping_address as any)?.fullName
- Address line 1: address_line1 || addressLine1
- Address line 2: address_line2 || addressLine2
- Enhanced order details dialog with better field handling
```

### Verification
1. Log in as staff user
2. Navigate to Operations > Orders
3. Verify customer names are visible in the orders table
4. Click on an order to view details
5. Verify full customer details (name, phone, address, email) are displayed

### If Issues Persist
1. Run `scripts/fix-staff-customer-details-access.sql` to diagnose
2. Check if orders have shipping_address populated
3. Verify RLS policies are correctly applied
4. Check browser console for any errors

---

## Files Modified

### Frontend
1. `src/pages/ProductDetail.tsx` - Subscription variant filtering
2. `src/pages/Checkout.tsx` - Subscription validation
3. `src/context/CartContext.tsx` - Cart validation
4. `src/pages/admin/OperationsPage.tsx` - Customer details display

### Scripts
1. `scripts/diagnose-missing-orders.sql` - Diagnostic script for missing orders
2. `scripts/fix-staff-customer-details-access.sql` - Diagnostic script for staff access

### Documentation
1. `ISSUES_FIX_SUMMARY.md` - This file

---

## Testing Checklist

### Issue 1: Missing Orders
- [ ] Run diagnostic script
- [ ] Check edge function logs
- [ ] Verify orders are created with proper user_id
- [ ] Confirm RLS policies allow admin/staff to view orders

### Issue 2: Subscription Model
- [ ] Test product page - subscription shows only 1000g
- [ ] Test adding 250g/500g as subscription - should fail
- [ ] Test adding 1000g as subscription - should work
- [ ] Test checkout with subscription - should process
- [ ] Verify cart validation works

### Issue 3: Staff Access
- [ ] Log in as staff
- [ ] Navigate to Operations > Orders
- [ ] Verify customer names visible in table
- [ ] Click order to view details
- [ ] Verify all customer details displayed (name, phone, address, email)

---

## Notes

1. **Subscription Model**: The restriction to 1000g variants is now enforced at multiple levels:
   - UI level (ProductDetail)
   - Cart level (CartContext)
   - Checkout level (Checkout)

2. **Customer Details**: Staff access should work as RLS policies already allow staff to view orders. The fix ensures the frontend properly displays the data regardless of field naming conventions.

3. **Missing Orders**: The diagnostic script will help identify the root cause. Common issues:
   - Orders created without user_id
   - Orders with missing order_number
   - RLS policy misconfiguration
   - Edge function errors during order creation

---

## Next Steps

1. **For Missing Orders**:
   - Run the diagnostic script
   - Review results and identify patterns
   - Fix any identified issues
   - Consider adding order_number generation if missing

2. **For Subscription Model**:
   - Test thoroughly with different products
   - Verify database has 1000g variants for subscription-eligible products
   - Update product data if needed

3. **For Staff Access**:
   - Test with actual staff account
   - Verify all customer details are visible
   - If issues persist, check RLS policies and database structure
