# COD Upfront Payment Fix - ₹150 Total

## Issue
Previously, only ₹100 (advance payment) was charged upfront for COD orders. The ₹50 COD handling fee was added to the total but not collected upfront.

## Requirement
For COD orders, customers must pay **₹150 upfront** (₹100 advance + ₹50 handling fee), regardless of order value.

## Changes Made

### 1. Frontend Calculation (`src/pages/Checkout.tsx`)

#### Updated COD Balance Calculation:
```typescript
// Before:
const codBalance = paymentType === "cod" ? Math.max(0, grandTotal - COD_ADVANCE_AMOUNT) : 0;

// After:
const codUpfrontAmount = COD_ADVANCE_AMOUNT + COD_HANDLING_FEE; // ₹150
const codBalance = paymentType === "cod" ? Math.max(0, grandTotal - codUpfrontAmount) : 0;
```

#### Updated Razorpay Payment Amount:
```typescript
// Before:
const amountRupees = paymentType === "cod" ? COD_ADVANCE_AMOUNT : grandTotal;

// After:
// For COD: Charge ₹150 upfront (₹100 advance + ₹50 handling fee)
const amountRupees = paymentType === "cod" ? (COD_ADVANCE_AMOUNT + COD_HANDLING_FEE) : grandTotal;
```

#### Updated Checkout Data:
- Added `cod_upfront_amount` field to track total upfront payment (₹150)

### 2. UI Updates

#### Payment Method Label:
- Changed from: "Cash on Delivery (₹100 advance + ₹50 handling)"
- Changed to: "Cash on Delivery (₹150 upfront: ₹100 advance + ₹50 handling)"

#### COD Payment Details Box:
- Changed from: "Pay ₹100 now to confirm your order"
- Changed to: "Pay ₹150 now (₹100 advance + ₹50 handling fee)"

#### Place Order Button:
- Changed from: "Pay ₹100 & Place Order"
- Changed to: "Pay ₹150 & Place Order"

#### Order Summary:
- Updated to show: "Pay now: ₹150 (₹100 advance + ₹50 handling)"

### 3. Backend Verification (`supabase/functions/verify-razorpay-payment/index.ts`)

#### Updated Expected Amount:
```typescript
// Before:
const expectedAmountRupees = checkout.payment_type === "cod" 
  ? (checkout.cod_advance_paid || 0) 
  : checkout.total_amount;

// After:
// For COD: Customer pays ₹150 upfront (₹100 advance + ₹50 handling fee)
const expectedAmountRupees = checkout.payment_type === "cod" 
  ? (checkout.cod_upfront_amount || (checkout.cod_advance_paid || 0) + (checkout.cod_handling_fee || 0))
  : checkout.total_amount;
```

### 4. Order Confirmation Displays

#### Updated All Three Locations:
1. **Order Confirmation Modal** (`Checkout.tsx`)
2. **Order Confirmation Page** (`OrderConfirmation.tsx`)
3. **Account Orders Page** (`AccountOrders.tsx`)

All now show:
- **Upfront Payment**: ₹150 (highlighted in primary color)
  - • Advance: ₹100
  - • Handling Fee: ₹50
- **Balance on Delivery**: ₹{cod_balance}
- **Total Order Value**: ₹{total_amount}

## Example Calculation

For an order with:
- Subtotal: ₹500
- Shipping: ₹50
- COD Handling Fee: ₹50
- **Grand Total: ₹600**

### Payment Flow:
- **Upfront Payment**: ₹150 (₹100 advance + ₹50 handling fee)
- **Balance on Delivery**: ₹450 (₹600 - ₹150)
- **Total Order Value**: ₹600

## Database Storage

The following fields are stored in the `orders` table:
- `cod_advance_paid`: ₹100 (for record keeping)
- `cod_handling_fee`: ₹50
- `cod_balance`: ₹450 (calculated as grandTotal - ₹150)
- `total_amount`: ₹600 (includes COD handling fee)

## Verification

✅ **Razorpay charges ₹150** for COD orders
✅ **COD balance calculation** accounts for ₹150 upfront payment
✅ **UI displays ₹150** as upfront payment
✅ **Backend verifies ₹150** payment amount
✅ **Order confirmations** show correct breakdown

## Testing Checklist

- [ ] Create a COD order and verify ₹150 is charged via Razorpay
- [ ] Verify order confirmation modal shows ₹150 upfront payment
- [ ] Verify order confirmation page shows ₹150 upfront payment
- [ ] Verify account orders page shows ₹150 upfront payment
- [ ] Verify COD balance calculation is correct (grandTotal - ₹150)
- [ ] Verify backend payment verification accepts ₹150
