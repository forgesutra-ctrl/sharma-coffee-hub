/**
 * Subscription Eligibility Helper
 * 
 * Determines if a product/variant is eligible for subscription based on:
 * 1. Product must be in "Coffee Powders" category (slug: 'coffee-powders')
 * 2. Variant must be 1000g (1kg)
 * 3. Product must have subscription_eligible flag set to true
 * 4. Product/variant must have razorpay_plan_id configured
 */

export interface ProductForSubscriptionCheck {
  subscription_eligible?: boolean | null;
  razorpay_plan_id?: string | null;
  categories?: {
    slug?: string | null;
    name?: string | null;
  } | null;
  category_id?: string | null;
  category?: string | null;
}

export interface VariantForSubscriptionCheck {
  weight: number;
  razorpay_plan_id?: string | null;
}

/**
 * Check if a product is in the Coffee Powders category
 */
export function isCoffeePowderProduct(product: ProductForSubscriptionCheck): boolean {
  // Check by category slug (preferred method)
  if (product.categories?.slug === 'coffee-powders') {
    return true;
  }
  
  // Fallback: Check by category name (case-insensitive)
  const categoryName = product.categories?.name || product.category || '';
  if (categoryName.toLowerCase().includes('coffee powder') || 
      categoryName.toLowerCase() === 'coffee powders') {
    return true;
  }
  
  return false;
}

/**
 * Check if a variant is eligible for subscription (must be 1000g)
 */
export function isSubscriptionEligibleVariant(variant: VariantForSubscriptionCheck): boolean {
  return variant.weight === 1000;
}

/**
 * Check if a product-variant combination is eligible for subscription
 * 
 * @param product - Product to check
 * @param variant - Variant to check (optional, if not provided, checks product-level eligibility)
 * @returns true if eligible, false otherwise
 */
export function isSubscriptionEligible(
  product: ProductForSubscriptionCheck,
  variant?: VariantForSubscriptionCheck
): boolean {
  // 1. Product must have subscription_eligible flag
  if (!product.subscription_eligible) {
    return false;
  }

  // 2. Product must be in Coffee Powders category
  if (!isCoffeePowderProduct(product)) {
    return false;
  }

  // 3. If variant is provided, it must be 1000g
  if (variant && !isSubscriptionEligibleVariant(variant)) {
    return false;
  }

  // 4. Product or variant must have razorpay_plan_id
  const planId = variant?.razorpay_plan_id || product.razorpay_plan_id;
  if (!planId) {
    return false;
  }

  return true;
}

/**
 * Get subscription eligibility error message
 */
export function getSubscriptionEligibilityError(
  product: ProductForSubscriptionCheck,
  variant?: VariantForSubscriptionCheck
): string | null {
  if (!product.subscription_eligible) {
    return null; // Not subscription eligible, no error needed
  }

  if (!isCoffeePowderProduct(product)) {
    return "Subscriptions are only available for Coffee Powder products";
  }

  if (variant && !isSubscriptionEligibleVariant(variant)) {
    return "Subscriptions are only available for 1000g (1kg) variants";
  }

  const planId = variant?.razorpay_plan_id || product.razorpay_plan_id;
  if (!planId) {
    return "Subscription plan not configured for this product";
  }

  return null;
}
