import { supabase } from '@/integrations/supabase/client';
import type { SubscriptionPlan } from '@/types';

/**
 * Validates if a subscription-eligible product has a valid Razorpay plan ID.
 * This is a fail-fast validation to prevent subscription checkout errors.
 * 
 * @param productId - The product ID to check
 * @returns Promise<{ isValid: boolean; plan: SubscriptionPlan | null; error?: string }>
 */
export async function validateSubscriptionPlan(productId: string): Promise<{
  isValid: boolean;
  plan: SubscriptionPlan | null;
  error?: string;
}> {
  try {
    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("product_id", productId)
      .eq("is_active", true)
      .maybeSingle();

    if (planError) {
      return {
        isValid: false,
        plan: null,
        error: `Failed to fetch subscription plan: ${planError.message}`,
      };
    }

    if (!planData) {
      return {
        isValid: false,
        plan: null,
        error: "Subscription plan not found for this product",
      };
    }

    if (!planData.razorpay_plan_id) {
      return {
        isValid: false,
        plan: planData as SubscriptionPlan,
        error: "Subscription plan not configured (missing Razorpay plan ID)",
      };
    }

    return {
      isValid: true,
      plan: planData as SubscriptionPlan,
    };
  } catch (error) {
    return {
      isValid: false,
      plan: null,
      error: error instanceof Error ? error.message : "Unknown error validating subscription plan",
    };
  }
}

/**
 * Throws an error if subscription_eligible product doesn't have a valid Razorpay plan ID.
 * Use this for fail-fast validation before allowing subscription actions.
 * 
 * @param productId - The product ID to validate
 * @param productName - Optional product name for error message
 * @throws Error if validation fails
 */
export async function assertSubscriptionPlanValid(
  productId: string,
  productName?: string
): Promise<SubscriptionPlan> {
  const validation = await validateSubscriptionPlan(productId);
  
  if (!validation.isValid) {
    const productLabel = productName ? ` for "${productName}"` : "";
    throw new Error(
      `Subscription plan not configured${productLabel}. ${validation.error || "Please contact support."}`
    );
  }

  if (!validation.plan) {
    throw new Error("Subscription plan validation failed: plan data is missing");
  }

  return validation.plan;
}
