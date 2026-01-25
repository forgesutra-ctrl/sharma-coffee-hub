# Quick Fix: Create Two Missing Orders

## Overview
This guide helps you create the two missing orders that should be visible in the admin dashboard.

## Orders to Create

### Order 1: pay_S7lzh49gPLcMMt
- **Amount**: ₹230.00
- **Date**: Jan 24, 2026, 9:27pm
- **Customer**: miteshjogi@gmail.com, +91 9867 420571

### Order 2: pay_S82FKkPoEM5yEk
- **Amount**: ₹2,000.00
- **Date**: Jan 25, 2026, 1:20pm
- **Customer**: gitajayraman123@gmail.com, +91 9820 530525
- **Razorpay Order ID**: order_S82FC7o8IoRlHW

---

## Step-by-Step Instructions

### Step 1: Gather Information

Before running the SQL scripts, you need to get:

1. **For both orders:**
   - Customer full name (from Razorpay dashboard)
   - Shipping address (from Razorpay payment details)
   - Pincode
   - Product details (what was ordered)

2. **For Order 1 (₹230):**
   - What product was ordered for ₹230?
   - Check Razorpay payment notes
   - Or contact customer: miteshjogi@gmail.com

3. **For Order 2 (₹2,000):**
   - Check if `pending_orders` table has cart data
   - The script will automatically check this
   - If found, it will use the cart data
   - If not, you need to determine products manually

### Step 2: Run SQL Scripts

#### For Order 1 (₹230):
```sql
-- Run: scripts/create-missing-order-pay_S7lzh49gPLcMMt.sql
```

**Before running, UPDATE:**
- Line with `'fullName', 'Customer'` - Replace with actual customer name
- Line with `'pincode', '...'` - Add actual pincode if available
- Order items section - Replace placeholder product with actual product details

#### For Order 2 (₹2,000):
```sql
-- Run: scripts/create-missing-order-pay_S82FKkPoEM5yEk.sql
```

**Before running, UPDATE:**
- If no `pending_order` found, update the manual order items section
- Replace placeholder products with actual products
- Update customer name and address if available

### Step 3: Verify Orders

After running each script, verify:

1. **Check order was created:**
   ```sql
   SELECT * FROM orders 
   WHERE razorpay_payment_id IN ('pay_S7lzh49gPLcMMt', 'pay_S82FKkPoEM5yEk');
   ```

2. **Check order items:**
   ```sql
   SELECT o.order_number, oi.* 
   FROM orders o
   JOIN order_items oi ON o.id = oi.order_id
   WHERE o.razorpay_payment_id IN ('pay_S7lzh49gPLcMMt', 'pay_S82FKkPoEM5yEk');
   ```

3. **Check admin visibility:**
   - Log in to admin dashboard
   - Navigate to Orders page
   - Both orders should be visible

---

## Important Notes

### Product Information Needed

**For Order 1 (₹230):**
- Need to know what product costs ₹230
- Could be a 250g variant of a product
- Check Razorpay payment notes or contact customer

**For Order 2 (₹2,000):**
- Script will check `pending_orders` table first
- If found, it will automatically use cart data
- If not found, you need to manually specify products
- Possible combinations:
  - 2x 1000g products at ₹1000 each
  - Multiple products totaling ₹2000

### Getting Product IDs

If you need to find product IDs:

```sql
-- Find products by price
SELECT p.id, p.name, pv.id as variant_id, pv.weight, pv.price
FROM products p
JOIN product_variants pv ON p.id = pv.product_id
WHERE pv.price = 230.00  -- For Order 1
   OR pv.price = 1000.00  -- For Order 2
ORDER BY pv.price;
```

### Shipping Address

If shipping address is not in Razorpay dashboard:
- Contact customers directly
- Use email/phone from payment details
- Or create order with minimal address (email/phone) and update later

---

## Quick Reference

### Order 1 Details
- Payment ID: `pay_S7lzh49gPLcMMt`
- Amount: ₹230.00
- Customer: miteshjogi@gmail.com, +91 9867 420571
- Script: `scripts/create-missing-order-pay_S7lzh49gPLcMMt.sql`

### Order 2 Details
- Payment ID: `pay_S82FKkPoEM5yEk`
- Order ID: `order_S82FC7o8IoRlHW`
- Amount: ₹2,000.00
- Customer: gitajayraman123@gmail.com, +91 9820 530525
- Script: `scripts/create-missing-order-pay_S82FKkPoEM5yEk.sql`

---

## After Creating Orders

1. **Run verification script:**
   ```sql
   -- Run: scripts/verify-razorpay-payments.sql
   ```
   Both orders should now show "✅ ORDER EXISTS"

2. **Check admin dashboard:**
   - Both orders should appear in Orders page
   - Order details should be complete
   - Order items should be visible

3. **If issues persist:**
   - Check RLS policies (admins should have access)
   - Verify order items were created
   - Check order status is 'confirmed'
