# Partial COD Logic Analysis for One-Time Orders

## Overview
This document analyzes how partial COD (Cash on Delivery) with advance payment and handling fees is implemented and displayed for one-time orders.

## COD Constants
**Location:** `src/lib/shipping.ts`

```typescript
export const COD_ADVANCE_AMOUNT = 100;  // ₹100 advance payment
export const COD_HANDLING_FEE = 50;     // ₹50 handling fee
```

## Calculation Logic

### 1. Frontend Calculation (Checkout.tsx)
**Location:** `src/pages/Checkout.tsx` (lines 343-366)

```typescript
const calculatedPrices = useMemo(() => {
  const subtotal = getCartTotal();
  const discount = appliedCoupon?.discount || 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - discount);
  
  let shippingCharge = 0;
  if (!allItemsAreSubscription && shippingInfo) {
    shippingCharge = getShippingCharge();
  }
  
  // COD calculations
  const codHandlingFee = paymentType === "cod" ? COD_HANDLING_FEE : 0;
  const grandTotal = subtotalAfterDiscount + shippingCharge + codHandlingFee;
  const codBalance = paymentType === "cod" ? Math.max(0, grandTotal - COD_ADVANCE_AMOUNT) : 0;
  
  return {
    subtotal,
    discount,
    subtotalAfterDiscount,
    shippingCharge,
    codHandlingFee,
    grandTotal,
    codBalance,
  };
}, [cartItems, appliedCoupon, shippingInfo, paymentType, allItemsAreSubscription, getCartTotal, getShippingCharge]);
```

### Calculation Formula:
- **Subtotal** = Sum of all cart items
- **Subtotal After Discount** = Subtotal - Discount (if coupon applied)
- **Shipping Charge** = Based on pincode region and weight
- **COD Handling Fee** = ₹50 (only if payment_type === "cod")
- **Grand Total** = Subtotal After Discount + Shipping Charge + COD Handling Fee
- **COD Balance** = Grand Total - ₹100 (amount to pay on delivery)
- **Amount Paid Now** = ₹100 (COD_ADVANCE_AMOUNT)

### Example:
- Subtotal: ₹500
- Shipping: ₹50
- COD Handling Fee: ₹50
- **Grand Total: ₹600**
- **Advance Paid: ₹100**
- **Balance on Delivery: ₹500**

---

## Data Flow

### 2. Checkout Data Preparation
**Location:** `src/pages/Checkout.tsx` (lines 509-536)

```typescript
const prepareCheckoutData = () => {
  return {
    user_id: user?.id,
    subtotal,
    total_amount: grandTotal,  // Includes COD handling fee
    shipping_address: shippingForm,
    pincode: shippingForm.pincode,
    shipping_region: shippingInfo?.region || "rest_of_india",
    shipping_charge: shippingCharge,
    payment_type: paymentType,
    cod_advance_paid: paymentType === "cod" ? COD_ADVANCE_AMOUNT : 0,  // ₹100
    cod_handling_fee: paymentType === "cod" ? COD_HANDLING_FEE : 0,    // ₹50
    cod_balance: paymentType === "cod" ? codBalance : 0,                // ₹500 (example)
    // ... other fields
  };
};
```

### 3. Payment Amount
**Location:** `src/pages/Checkout.tsx` (line 967)

```typescript
const amountRupees = paymentType === "cod" ? COD_ADVANCE_AMOUNT : grandTotal;
// For COD: Only ₹100 is charged via Razorpay
// For Prepaid: Full grandTotal is charged
```

### 4. Backend Storage
**Location:** `supabase/functions/verify-razorpay-payment/index.ts` (lines 318-320)

```typescript
cod_advance_paid: checkout.cod_advance_paid || 0,  // Stored in database
cod_handling_fee: checkout.cod_handling_fee || 0,   // Stored in database
cod_balance: checkout.cod_balance || 0,             // Stored in database
```

**Database Columns:**
- `orders.cod_advance_paid` (numeric)
- `orders.cod_handling_fee` (numeric)
- `orders.cod_balance` (numeric)
- `orders.payment_type` (text: "cod" or "prepaid")
- `orders.total_amount` (numeric: includes COD handling fee)

---

## Display Logic

### 5. Checkout Page Display
**Location:** `src/pages/Checkout.tsx`

#### Payment Method Selection (lines 1683-1685):
```typescript
<Label htmlFor="cod" className="cursor-pointer">
  Cash on Delivery (₹{COD_ADVANCE_AMOUNT} advance + ₹{COD_HANDLING_FEE} handling)
</Label>
```

#### COD Details Box (lines 1692-1698):
```typescript
{paymentType === "cod" && !allItemsAreSubscription && (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
    <p className="font-medium mb-2 text-primary">COD Payment Details:</p>
    <ul className="space-y-1 text-muted-foreground">
      <li>• Pay ₹{COD_ADVANCE_AMOUNT} now to confirm your order</li>
      <li>• Pay remaining ₹{codBalance.toFixed(2)} on delivery</li>
      <li>• COD handling fee: ₹{COD_HANDLING_FEE}</li>
    </ul>
  </div>
)}
```

#### Order Summary (lines 1786-1810):
```typescript
{codHandlingFee > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">COD Handling Fee</span>
    <span>₹{codHandlingFee.toFixed(2)}</span>
  </div>
)}

{paymentType === "cod" && !allItemsAreSubscription && (
  <div className="mt-2 text-xs text-muted-foreground">
    <p>Pay now: ₹{COD_ADVANCE_AMOUNT}</p>
    <p>Pay on delivery: ₹{codBalance.toFixed(2)}</p>
  </div>
)}
```

#### Place Order Button (line 1723):
```typescript
{paymentType === "cod"
  ? `Pay ₹${COD_ADVANCE_AMOUNT} & Place Order`
  : `Pay ₹${grandTotal.toFixed(2)} & Place Order`}
```

---

## Issues Found

### ❌ **ISSUE 1: COD Details Missing in Order Confirmation Modal**
**Location:** `src/pages/Checkout.tsx` (lines 1940-1972)

**Current State:**
- Only shows "Payment Method: Cash on Delivery"
- Shows "Total Paid: ₹{total_amount}" (which is the FULL amount including COD balance)
- **Missing:** COD advance paid, COD handling fee, COD balance breakdown

**What Should Be Displayed:**
- Advance Paid: ₹100
- COD Handling Fee: ₹50
- Balance on Delivery: ₹500
- Total Order Value: ₹600

### ❌ **ISSUE 2: COD Details Missing in Order Confirmation Page**
**Location:** `src/pages/OrderConfirmation.tsx` (lines 358-387)

**Current State:**
- Only shows "Payment Method: Cash on Delivery"
- Shows "Total Paid: ₹{total_amount}" (incorrect - should show advance paid)
- **Missing:** COD breakdown

### ❌ **ISSUE 3: COD Details Missing in Account Orders**
**Location:** `src/pages/account/AccountOrders.tsx` (lines 337-358)

**Current State:**
- Shows only "Total: ₹{total_amount}"
- **Missing:** COD advance, handling fee, and balance information

---

## Database Storage Verification

### Fields Stored Correctly:
✅ `cod_advance_paid` - Stored as ₹100
✅ `cod_handling_fee` - Stored as ₹50
✅ `cod_balance` - Stored as calculated balance
✅ `payment_type` - Stored as "cod"
✅ `total_amount` - Stored as grandTotal (includes COD handling fee)

### Payment Status:
- For COD: `payment_status` = "advance_paid" (line 301 in verify-razorpay-payment)
- For Prepaid: `payment_status` = "paid"

---

## Summary

### ✅ What's Working:
1. COD calculation is correct
2. COD data is sent to backend correctly
3. COD data is stored in database correctly
4. COD is displayed correctly during checkout
5. Only ₹100 advance is charged via Razorpay for COD orders

### ❌ What's Missing:
1. **COD breakdown not shown in order confirmation modal**
2. **COD breakdown not shown in order confirmation page**
3. **COD breakdown not shown in account orders page**
4. **"Total Paid" shows full amount instead of advance paid for COD orders**

### Recommended Fixes:
1. Update order confirmation modal to show COD breakdown when `payment_type === "cod"`
2. Update order confirmation page to show COD breakdown
3. Update account orders page to show COD details
4. Change "Total Paid" to "Advance Paid" for COD orders, and show balance separately
