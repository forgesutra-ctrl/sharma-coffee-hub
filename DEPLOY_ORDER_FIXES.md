# Deploy Order Creation Fixes

## Overview
This document provides step-by-step instructions to deploy the fixes that prevent missing orders.

---

## Root Causes Fixed

1. ✅ **Phone Number Format** - Normalized automatically (removes +91)
2. ✅ **Order Number Generation** - Generated explicitly in code
3. ✅ **Order Items Creation** - Made critical (order rolled back if items fail)
4. ✅ **Error Handling** - Enhanced logging and error messages
5. ✅ **Recovery Mechanism** - Function to find missing orders

---

## Deployment Steps

### Step 1: Deploy Database Migration

1. **Open Supabase Dashboard**
   - Go to SQL Editor
   - Create a new query

2. **Run Migration**
   ```sql
   -- Copy and paste contents of:
   -- supabase/migrations/20260125000000_fix_order_creation_reliability.sql
   ```

3. **Verify Migration**
   ```sql
   -- Check that triggers exist
   SELECT trigger_name, event_manipulation, event_object_table
   FROM information_schema.triggers
   WHERE event_object_table = 'orders'
   AND trigger_name IN ('set_order_number', 'validate_order_shipping_address_trigger');
   ```

### Step 2: Deploy Edge Functions

#### Option A: Using Supabase CLI
```bash
# Deploy verify-razorpay-payment (updated)
supabase functions deploy verify-razorpay-payment

# Deploy razorpay-webhook (updated)
supabase functions deploy razorpay-webhook

# Deploy recover-missing-orders (new)
supabase functions deploy recover-missing-orders
```

#### Option B: Using Supabase Dashboard
1. Go to Edge Functions in Supabase Dashboard
2. For each function:
   - Click "Edit"
   - Copy the updated code
   - Save and Deploy

### Step 3: Test the Fixes

#### Test 1: Phone Number Normalization
1. Place a test order with phone number in `+91XXXXXXXXXX` format
2. Verify order is created successfully
3. Check database - phone should be normalized to `XXXXXXXXXX`

#### Test 2: Order Number Generation
1. Place a test order
2. Verify order has a proper order_number (not empty)
3. Check format: `ORD-YYYYMMDD-XXXX`

#### Test 3: Order Items Creation
1. Place a test order
2. Verify order has order items
3. If items fail, order should be rolled back

### Step 4: Set Up Recovery Mechanism (Optional)

#### Manual Check
```bash
# Call recover-missing-orders function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/recover-missing-orders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### Automated Check (Cron)
Set up a daily cron job to call the recovery function:
- Use Supabase Cron Jobs (if available)
- Or external cron service
- Or GitHub Actions scheduled workflow

---

## Verification Queries

### Check Recent Orders
```sql
-- Run: scripts/check-missing-orders-recovery.sql
```

### Verify Phone Normalization
```sql
SELECT 
  order_number,
  shipping_address->>'phone' as phone,
  created_at
FROM orders
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;
```

### Verify All Orders Have Items
```sql
SELECT 
  o.order_number,
  COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= NOW() - INTERVAL '7 days'
GROUP BY o.order_number
HAVING COUNT(oi.id) = 0;
```

---

## Files Changed

### Edge Functions
1. `supabase/functions/verify-razorpay-payment/index.ts`
   - Phone normalization
   - Explicit order number generation
   - Critical order items creation
   - Better error handling

2. `supabase/functions/razorpay-webhook/index.ts`
   - Phone normalization
   - Critical order items creation

3. `supabase/functions/recover-missing-orders/index.ts` (NEW)
   - Recovery mechanism

### Database Migrations
1. `supabase/migrations/20260125000000_fix_order_creation_reliability.sql` (NEW)
   - Improved order number generation
   - Enhanced phone validation with auto-normalization

### Scripts
1. `scripts/check-missing-orders-recovery.sql` (NEW)
   - Diagnostic queries

---

## Expected Results

After deployment:

✅ **No more phone number validation errors**
✅ **All orders have order_numbers**
✅ **No orders without items**
✅ **Better error messages for debugging**
✅ **Recovery mechanism available**

---

## Monitoring

### Daily
- Check edge function logs for errors
- Run `check-missing-orders-recovery.sql`
- Verify no orders without items

### Weekly
- Call `recover-missing-orders` function
- Review missing orders report
- Fix any remaining issues

---

## Rollback

If issues occur:

1. **Revert Edge Functions**
   - Deploy previous versions from git history

2. **Revert Migration** (if needed)
   ```sql
   -- Revert to previous trigger versions
   -- Check git history for previous migration
   ```

3. **Monitor Logs**
   - Check for specific error patterns
   - Identify root cause

---

## Support

If you encounter issues:
1. Check edge function logs
2. Run diagnostic scripts
3. Review error messages
4. Check database triggers are active
