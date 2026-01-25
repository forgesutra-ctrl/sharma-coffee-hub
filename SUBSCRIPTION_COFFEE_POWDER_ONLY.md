# Restrict Subscriptions to Coffee Powders Only

## Date: January 25, 2026

This document outlines the changes made to restrict subscriptions to only Coffee Powder products with 1000g variants.

---

## Requirements

1. ✅ Subscriptions only available for products in "Coffee Powders" category
2. ✅ Subscriptions only available for 1000g (1kg) variants
3. ✅ Remove subscription features from all other products
4. ✅ Frontend validation to prevent subscription selection for non-eligible products
5. ✅ Backend validation to prevent subscription creation for non-eligible products

---

## Changes Made

### 1. New Helper Function: `src/lib/subscription-eligibility.ts`

Created comprehensive subscription eligibility checker:

```typescript
// Checks:
// 1. Product must be subscription_eligible = true
// 2. Product must be in Coffee Powders category (slug: 'coffee-powders')
// 3. Variant must be 1000g
// 4. Product/variant must have razorpay_plan_id
export function isSubscriptionEligible(product, variant?)
```

**Functions:**
- `isCoffeePowderProduct()` - Checks if product is in Coffee Powders category
- `isSubscriptionEligibleVariant()` - Checks if variant is 1000g
- `isSubscriptionEligible()` - Full validation (category + weight + plan)
- `getSubscriptionEligibilityError()` - Returns user-friendly error message

### 2. Frontend Updates

#### ProductDetail.tsx
- ✅ Uses `isSubscriptionEligible()` to check full eligibility
- ✅ Hides subscription option for non-Coffee Powder products
- ✅ Only shows subscription option if product is in Coffee Powders category AND has 1000g variant
- ✅ Validates category + weight before allowing subscription selection
- ✅ Shows appropriate error messages

#### CartContext.tsx
- ✅ Validates subscription items are 1000g
- ✅ Validates subscription items are subscription-eligible products
- ✅ Shows error toast if validation fails

#### Checkout.tsx
- ✅ Pre-checkout validation for subscription items
- ✅ Checks both weight (1000g) and product eligibility
- ✅ Prevents checkout if invalid subscription items in cart

#### SubscriptionCard.tsx
- ✅ Checks full eligibility before showing card
- ✅ Validates variant is 1000g
- ✅ Only displays for eligible products

### 3. Backend Updates

#### create-razorpay-subscription/index.ts
- ✅ Validates product is subscription_eligible
- ✅ Validates product is in Coffee Powders category
- ✅ Validates variant is 1000g
- ✅ Returns appropriate error messages for each validation failure

### 4. Database Migration: `20260125000002_restrict_subscription_to_coffee_powders.sql`

- ✅ Updates existing products: Removes `subscription_eligible = true` from non-Coffee Powder products
- ✅ Creates validation function: `validate_subscription_eligibility()`
- ✅ Creates trigger: Prevents setting `subscription_eligible = true` for non-Coffee Powder products
- ✅ Verification queries: Check which products have subscriptions enabled

---

## Validation Logic

### Subscription Eligibility Checklist

For a product-variant combination to be subscription eligible:

1. ✅ **Product Level:**
   - `subscription_eligible = true`
   - Category slug = `'coffee-powders'` OR category name contains "coffee powder"
   - Product or variant has `razorpay_plan_id`

2. ✅ **Variant Level:**
   - `weight = 1000` (1kg only)

3. ✅ **Plan Configuration:**
   - `razorpay_plan_id` must be configured (product or variant level)

---

## Files Modified

### Frontend
1. **`src/lib/subscription-eligibility.ts`** (NEW)
   - Subscription eligibility helper functions

2. **`src/pages/ProductDetail.tsx`**
   - Uses new eligibility checker
   - Hides subscription option for non-eligible products
   - Validates before allowing subscription selection

3. **`src/context/CartContext.tsx`**
   - Validates subscription items on add to cart
   - Shows error messages

4. **`src/pages/Checkout.tsx`**
   - Pre-checkout validation for subscriptions
   - Validates category and weight

5. **`src/components/subscription/SubscriptionCard.tsx`**
   - Checks eligibility before displaying
   - Validates variant weight

### Backend
1. **`supabase/functions/create-razorpay-subscription/index.ts`**
   - Category validation
   - Weight validation
   - Comprehensive error messages

### Database
1. **`supabase/migrations/20260125000002_restrict_subscription_to_coffee_powders.sql`** (NEW)
   - Updates existing products
   - Creates validation trigger
   - Verification queries

---

## Deployment Steps

### Step 1: Deploy Database Migration
```sql
-- Run in Supabase SQL Editor:
-- supabase/migrations/20260125000002_restrict_subscription_to_coffee_powders.sql
```

### Step 2: Verify Products
```sql
-- Check which products have subscription_eligible = true
SELECT 
  p.name,
  c.name as category,
  p.subscription_eligible
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.subscription_eligible = true;
```

### Step 3: Test Frontend
1. Navigate to a Coffee Powder product
2. Verify subscription option appears (for 1000g variant)
3. Navigate to a non-Coffee Powder product
4. Verify subscription option does NOT appear
5. Try to add non-1000g variant as subscription - should fail
6. Try to checkout with invalid subscription items - should fail

---

## Expected Behavior

### ✅ Coffee Powder Products (1000g variant)
- Subscription option visible
- Can select subscription
- Can add to cart as subscription
- Can checkout subscription order

### ❌ Coffee Powder Products (250g or 500g variant)
- Subscription option NOT visible
- Cannot select subscription
- Error if trying to add as subscription

### ❌ Non-Coffee Powder Products (any weight)
- Subscription option NOT visible
- Cannot select subscription
- Error if trying to add as subscription

---

## Verification

### Test 1: Coffee Powder Product (1000g)
1. Go to product detail page
2. ✅ Subscription option should be visible
3. ✅ Can select subscription
4. ✅ Can add to cart

### Test 2: Coffee Powder Product (250g)
1. Go to product detail page
2. ✅ Subscription option should NOT be visible
3. ✅ If somehow selected, should show error

### Test 3: Non-Coffee Powder Product
1. Go to product detail page (e.g., Tea, Equipment)
2. ✅ Subscription option should NOT be visible
3. ✅ Product should not have subscription_eligible = true in database

### Test 4: Database Validation
```sql
-- Should return only Coffee Powder products
SELECT p.name, c.name as category
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.subscription_eligible = true
AND (c.slug = 'coffee-powders' OR LOWER(c.name) LIKE '%coffee powder%');
```

---

## Error Messages

Users will see these error messages:

1. **Non-Coffee Powder Product:**
   - "Subscriptions are only available for Coffee Powder products"

2. **Non-1000g Variant:**
   - "Subscriptions are only available for 1000g (1kg) variants"

3. **Missing Plan ID:**
   - "Subscription plan not configured for this product"

4. **Combined:**
   - "This product is not eligible for subscription. Subscriptions are only available for Coffee Powder products in 1000g (1kg) size."

---

## Notes

- The validation is enforced at multiple levels:
  1. **Database Trigger** - Prevents setting subscription_eligible for non-Coffee Powder products
  2. **Frontend UI** - Hides subscription option for non-eligible products
  3. **Cart Validation** - Prevents adding invalid subscriptions to cart
  4. **Checkout Validation** - Prevents checkout with invalid subscriptions
  5. **Backend API** - Validates before creating subscription

- All existing subscription-eligible products that are NOT in Coffee Powders category will have their `subscription_eligible` flag set to `false` by the migration.

- The trigger ensures no new products can be set as subscription-eligible unless they're in the Coffee Powders category.
