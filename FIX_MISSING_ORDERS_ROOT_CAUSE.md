# Fix Missing Orders - Root Cause Resolution

## Date: January 25, 2026

This document outlines the comprehensive fix for missing orders issue.

---

## Root Causes Identified

### 1. **Phone Number Format Validation Failure** ❌
- **Issue**: Database trigger `validate_order_shipping_address()` requires 10-digit phone numbers (no +91)
- **Problem**: Phone numbers from Razorpay come in `+91XXXXXXXXXX` format
- **Impact**: Order creation fails silently when phone validation fails
- **Fix**: Normalize phone numbers in edge function before inserting

### 2. **Order Number Generation** ⚠️
- **Issue**: Order number set to empty string `""` and relies on database trigger
- **Problem**: If trigger fails, order might fail validation or have empty order_number
- **Impact**: Orders might be created but not visible or fail validation
- **Fix**: Generate order_number explicitly in edge function

### 3. **Order Items Creation Not Critical** ⚠️
- **Issue**: If order items fail to create, order still succeeds
- **Problem**: Results in orders without items (like `ORD-20260123-0840`)
- **Impact**: Orders exist but are incomplete
- **Fix**: Make order items creation critical - rollback order if items fail

### 4. **No Recovery Mechanism** ❌
- **Issue**: No way to catch missing orders automatically
- **Problem**: Missing orders only discovered manually
- **Impact**: Orders remain missing until manually fixed
- **Fix**: Create recovery function to check Razorpay for missing orders

---

## Fixes Applied

### 1. Edge Function: `verify-razorpay-payment/index.ts`

#### Phone Number Normalization
```typescript
// Normalize phone number in shipping_address (remove +91, spaces, etc.)
const normalizedShippingAddress = { ...checkout.shipping_address };
if (normalizedShippingAddress.phone) {
  const phoneDigits = normalizedShippingAddress.phone.replace(/\D/g, '');
  if (phoneDigits.length === 12 && phoneDigits.startsWith('91')) {
    normalizedShippingAddress.phone = phoneDigits.substring(2);
  } else if (phoneDigits.length === 10) {
    normalizedShippingAddress.phone = phoneDigits;
  }
}
```

#### Explicit Order Number Generation
```typescript
// Generate order number explicitly (don't rely on trigger)
const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
```

#### Critical Order Items Creation
```typescript
// If order items fail, delete the order and throw error
if (itemsError) {
  await supabase.from("orders").delete().eq("id", order.id);
  throw new Error(`Failed to create order items: ${itemsError.message}. Order was rolled back.`);
}
```

### 2. Database Migration: `20260125000000_fix_order_creation_reliability.sql`

#### Improved Order Number Generation
- Added retry logic for uniqueness
- Fallback to timestamp-based generation if needed
- More robust error handling

#### Enhanced Phone Number Validation
- Automatically normalizes phone numbers in trigger
- Handles both `+91XXXXXXXXXX` and `XXXXXXXXXX` formats
- Updates shipping_address with normalized phone

### 3. Recovery Function: `recover-missing-orders/index.ts`

- Checks Razorpay for captured payments
- Compares with database orders
- Reports missing orders
- Can be called periodically via cron

---

## Files Modified

1. **`supabase/functions/verify-razorpay-payment/index.ts`**
   - Phone number normalization
   - Explicit order number generation
   - Critical order items creation
   - Better error handling and logging

2. **`supabase/migrations/20260125000000_fix_order_creation_reliability.sql`**
   - Improved order number generation function
   - Enhanced phone number validation with auto-normalization
   - More robust triggers

3. **`supabase/functions/recover-missing-orders/index.ts`** (NEW)
   - Recovery mechanism to find missing orders
   - Can be called periodically

4. **`scripts/check-missing-orders-recovery.sql`** (NEW)
   - Diagnostic script to check for issues

---

## Deployment Steps

### Step 1: Deploy Database Migration
```sql
-- Run in Supabase SQL Editor:
-- supabase/migrations/20260125000000_fix_order_creation_reliability.sql
```

### Step 2: Deploy Edge Function Updates
```bash
# Deploy updated verify-razorpay-payment function
supabase functions deploy verify-razorpay-payment

# Deploy new recover-missing-orders function
supabase functions deploy recover-missing-orders
```

### Step 3: Test the Fixes
1. Place a test order
2. Verify order is created with proper order_number
3. Verify phone number is normalized correctly
4. Verify order items are created

### Step 4: Set Up Recovery Mechanism (Optional)
- Call `recover-missing-orders` function daily via cron
- Review missing orders report
- Create missing orders using the scripts

---

## Verification

### Test Phone Number Normalization
```sql
-- Test that phone numbers are normalized correctly
SELECT 
  shipping_address->>'phone' as phone,
  order_number,
  created_at
FROM orders
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;
```

### Test Order Number Generation
```sql
-- Verify all orders have order_numbers
SELECT 
  COUNT(*) as total_orders,
  COUNT(order_number) as orders_with_number,
  COUNT(*) FILTER (WHERE order_number IS NULL OR order_number = '') as orders_without_number
FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days';
```

### Test Order Items Creation
```sql
-- Verify all orders have items
SELECT 
  o.id,
  o.order_number,
  COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY o.id, o.order_number
HAVING COUNT(oi.id) = 0;
```

---

## Prevention

### 1. **Automatic Phone Normalization**
- Phone numbers are now normalized before database insertion
- Trigger also normalizes as a backup
- Both formats (`+91XXXXXXXXXX` and `XXXXXXXXXX`) are handled

### 2. **Explicit Order Number Generation**
- Order numbers are generated in edge function
- Database trigger provides backup
- Retry logic ensures uniqueness

### 3. **Critical Order Items**
- Order creation fails if items cannot be created
- Order is rolled back if items fail
- Prevents incomplete orders

### 4. **Recovery Mechanism**
- `recover-missing-orders` function can catch missing orders
- Can be called periodically
- Provides report of missing orders

### 5. **Better Error Handling**
- Comprehensive error logging
- Detailed error messages
- Error context for debugging

---

## Monitoring

### Daily Checks
1. Run `scripts/check-missing-orders-recovery.sql` daily
2. Review edge function logs for errors
3. Check for orders without items

### Weekly Checks
1. Call `recover-missing-orders` function
2. Review missing orders report
3. Verify all captured payments have orders

---

## Expected Results

After deploying these fixes:

✅ **All orders will have order_numbers**
✅ **Phone numbers will be normalized automatically**
✅ **Orders without items will be prevented**
✅ **Better error messages for debugging**
✅ **Recovery mechanism to catch any missed orders**

---

## Rollback Plan

If issues occur:

1. **Revert edge function**: Deploy previous version
2. **Revert migration**: Run rollback SQL (if needed)
3. **Monitor logs**: Check for specific error patterns

---

## Notes

- The fixes are backward compatible
- Existing orders are not affected
- New orders will benefit from all improvements
- Recovery function is optional but recommended
