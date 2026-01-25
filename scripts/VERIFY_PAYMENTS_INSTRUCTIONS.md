# Instructions: Verify Razorpay Payments

## Overview
This script verifies if payments from Razorpay dashboard have corresponding orders in the database.

## Payment List to Verify

### ✅ Captured Payments (Should have orders):
1. **pay_S7yVokl4FmKHCw** - ₹750 - Jan 25, 9:41am
2. **pay_S7lzh49gPLcMMt** - ₹230 - Jan 24, 9:27pm
3. **pay_S7ZwMsB6thhMqq** - ₹910 - Jan 24, 9:39am
4. **pay_S7MTymf7bD0uYy** - ₹950 - Jan 23, 8:29pm
5. **pay_S7CcXgjw7B2sjW** - ₹940 - Jan 23, 10:50am
6. **pay_S79HNY2ky0Qou9** - ₹840 - Jan 23, 7:34am

### ❌ Failed Payments (Should NOT have orders):
1. **pay_S7lsCnFdtyWn5r** - ₹230 - Failed - Jan 24, 9:20pm
2. **pay_S7c02ct3bM3mnK** - ₹270 - Failed - Jan 24, 11:40am

## How to Use

1. **Open Supabase SQL Editor**
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Create a new query

2. **Run the Verification Script**
   - Open `scripts/verify-razorpay-payments.sql`
   - Copy and paste the entire script
   - Execute the query

3. **Review Results**

### Expected Results:

#### ✅ Good Results:
- **Captured payments** should show "✅ ORDER EXISTS"
- **Failed payments** should show "⚠️ NO ORDER (Expected - Payment Failed)"
- All amounts should match between Razorpay and database
- All orders should have order items

#### ❌ Issues to Look For:
- **"❌ MISSING ORDER"** - A captured payment doesn't have an order
  - This means the order creation failed
  - Check edge function logs for `verify-razorpay-payment`
  
- **"⚠️ AMOUNT MISMATCH"** - Order amount doesn't match payment amount
  - This could indicate a calculation error
  
- **"⚠️ NO ITEMS"** - Order exists but has no order items
  - Order was created but items weren't added
  - Check order_items table

- **Duplicate orders** - Same payment ID has multiple orders
  - This shouldn't happen
  - Indicates a bug in order creation logic

## What to Do If Orders Are Missing

### If a captured payment has no order:

1. **Check Edge Function Logs**
   - Go to Supabase Dashboard > Edge Functions
   - Check `verify-razorpay-payment` function logs
   - Look for errors around the payment date/time

2. **Check Payment Verification**
   - The payment might have failed verification
   - Check if payment amount matches expected amount
   - Verify payment status is "captured"

3. **Manual Order Creation**
   - If needed, you can manually create the order
   - Use the backfill script as reference: `scripts/backfill-missing-orders.sql`

4. **Check RLS Policies**
   - Verify admin/staff can view orders
   - Run: `scripts/diagnose-missing-orders.sql`

## Summary Report

The script will provide:
- ✅ Count of captured payments with orders
- ❌ Count of captured payments missing orders
- ⚠️ Count of failed payments (expected to have no orders)
- 🔍 Detailed breakdown for each payment

## Next Steps After Verification

1. **If all orders exist**: ✅ System is working correctly
2. **If orders are missing**: 
   - Check edge function logs
   - Review order creation flow
   - Consider backfilling missing orders
3. **If amounts don't match**:
   - Review checkout calculation logic
   - Check for discount/promotion issues
