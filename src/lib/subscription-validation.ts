/**
 * Validates if a subscription-eligible product has a valid Razorpay plan ID.
 * This is a fail-fast validation to prevent subscription checkout errors.
 * 
 * @param product - The product object to check (must have subscription_eligible and razorpay_plan_id)
 * @returns { isValid: boolean; error?: string }
 */
export function validateSubscriptionPlan(product: {
  subscription_eligible?: boolean | null;
  razorpay_plan_id?: string | null;
}): {
  isValid: boolean;
  error?: string;
} {
  // If product is not subscription eligible, validation passes (not applicable)
  if (!product.subscription_eligible) {
    return { isValid: true };
  }

  // If subscription eligible but no plan ID, validation fails
  if (!product.razorpay_plan_id) {
    return {
      isValid: false,
      error: "Subscription plan not configured (missing Razorpay plan ID)",
    };
  }

  return { isValid: true };
}

/**
 * Throws an error if subscription_eligible product doesn't have a valid Razorpay plan ID.
 * Use this for fail-fast validation before allowing subscription actions.
 * 
 * @param product - The product object to validate
 * @param productName - Optional product name for error message
 * @throws Error if validation fails
 */
export function assertSubscriptionPlanValid(
  product: {
    subscription_eligible?: boolean | null;
    razorpay_plan_id?: string | null;
  },
  productName?: string
): void {
  const validation = validateSubscriptionPlan(product);
  
  if (!validation.isValid) {
    const productLabel = productName ? ` for "${productName}"` : "";
    throw new Error(
      `Subscription plan not configured${productLabel}. ${validation.error || "Please contact support."}`
    );
  }
}
