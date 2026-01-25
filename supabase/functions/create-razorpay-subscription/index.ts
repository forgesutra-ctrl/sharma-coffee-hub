import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSubscriptionRequest {
  user_id: string;
  access_token: string;
  product_id: string;
  variant_id: string; // REQUIRED - determines which plan to use
  quantity: number;
  preferred_delivery_date: number; // 1-28
  total_deliveries: number;
  shipping_address: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const requestData: CreateSubscriptionRequest = await req.json();

    // Validate required fields
    const {
      user_id,
      access_token,
      product_id,
      variant_id,
      quantity,
      preferred_delivery_date,
      total_deliveries,
      shipping_address,
    } = requestData;

    if (!user_id || !access_token || !product_id || !variant_id || !quantity || !preferred_delivery_date || !shipping_address) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate delivery date
    if (preferred_delivery_date < 1 || preferred_delivery_date > 28) {
      return new Response(
        JSON.stringify({ error: "Delivery date must be between 1 and 28" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: `Bearer ${access_token}` } },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user || user.id !== user_id) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ User authenticated:", user.id);

    // Get Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ✅ CRITICAL: Fetch variant to get razorpay_plan_id
    const { data: variant, error: variantError } = await supabaseAdmin
      .from("product_variants")
      .select("id, price, razorpay_plan_id")
      .eq("id", variant_id)
      .single();

    if (variantError || !variant) {
      console.error("❌ Variant not found:", variant_id);
      return new Response(
        JSON.stringify({ error: "Product variant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ CRITICAL: Check if variant has razorpay_plan_id
    if (!variant.razorpay_plan_id) {
      console.error("❌ Variant missing razorpay_plan_id:", variant_id);
      return new Response(
        JSON.stringify({
          error: "Subscription unavailable",
          details: "This product is currently unavailable for subscription. Please try one-time purchase instead.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Variant found:", {
      variant_id: variant.id,
      price: variant.price,
      plan_id: variant.razorpay_plan_id,
    });

    // Verify product exists and check category
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select(`
        id, 
        name,
        subscription_eligible,
        category_id,
        categories (
          id,
          name,
          slug
        )
      `)
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      console.error("❌ Product not found:", product_id);
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ CRITICAL: Validate subscription eligibility
    // 1. Product must be subscription_eligible
    if (!product.subscription_eligible) {
      console.error("❌ Product not subscription eligible:", product_id);
      return new Response(
        JSON.stringify({ 
          error: "Subscription unavailable",
          details: "This product is not eligible for subscription.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Product must be in Coffee Powders category
    const categorySlug = (product.categories as any)?.slug;
    const categoryName = (product.categories as any)?.name || product.category;
    const isCoffeePowder = categorySlug === 'coffee-powders' || 
                          categoryName?.toLowerCase().includes('coffee powder') ||
                          categoryName?.toLowerCase() === 'coffee powders';
    
    if (!isCoffeePowder) {
      console.error("❌ Product not in Coffee Powders category:", {
        product_id: product.id,
        category_slug: categorySlug,
        category_name: categoryName,
      });
      return new Response(
        JSON.stringify({ 
          error: "Subscription unavailable",
          details: "Subscriptions are only available for Coffee Powder products.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Variant must be 1000g
    const { data: variantForWeight, error: weightError } = await supabaseAdmin
      .from("product_variants")
      .select("weight")
      .eq("id", variant_id)
      .single();

    if (weightError || !variantForWeight) {
      console.error("❌ Failed to fetch variant weight:", variant_id);
      return new Response(
        JSON.stringify({ error: "Variant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (variantForWeight.weight !== 1000) {
      console.error("❌ Variant is not 1000g:", {
        variant_id: variant_id,
        weight: variantForWeight.weight,
      });
      return new Response(
        JSON.stringify({ 
          error: "Subscription unavailable",
          details: "Subscriptions are only available for 1000g (1kg) variants.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Razorpay credentials
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("Razorpay credentials not configured");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ CRITICAL: Verify the plan exists and get its amount
    // Always and only use the plan ID from the variant row in the database.
    const planId = variant.razorpay_plan_id;

    if (!planId) {
      console.error("❌ Variant missing razorpay_plan_id at plan verification step:", {
        variant_id: variant.id,
      });
      return new Response(
        JSON.stringify({
          error: "Subscription unavailable",
          details: "This product is currently unavailable for subscription. Please try one-time purchase instead.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    
    console.log("🔍 Verifying Razorpay plan using variant.razorpay_plan_id:", planId);
    
    const planResponse = await fetch(`https://api.razorpay.com/v1/plans/${planId}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${authString}`,
      },
    });

    if (!planResponse.ok) {
      const errorText = await planResponse.text();
      console.error("❌ Plan not found in Razorpay:", errorText);
      return new Response(
        JSON.stringify({
          error: "Subscription plan not found",
          details: "The subscription plan for this product is not configured. Please contact support.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planData = await planResponse.json();
    const planAmountPaise = planData.item?.amount || planData.amount || 0;
    const planAmountRupees = planAmountPaise / 100;

    console.log("✅ Plan verified:", {
      plan_id: planId,
      amount_paise: planAmountPaise,
      amount_rupees: planAmountRupees,
      raw_status: (planData as any).status,
    });

    // ✅ Plan status validation
    // Razorpay's /v1/plans API may not always include a `status` field.
    // Treat missing/undefined status as active, but still respect explicit "inactive"-like values.
    const planStatus = (planData as any).status as string | undefined;

    if (planStatus && planStatus.toLowerCase() !== "active") {
      console.error("❌ Plan is not active according to Razorpay status field:", planStatus);
      return new Response(
        JSON.stringify({
          error: "Subscription plan not active",
          details: "The subscription plan is currently inactive. Please contact support.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // CREATE RAZORPAY SUBSCRIPTION (BILLING ONLY)
    // ============================================
    const subscriptionPayload = {
      plan_id: variant.razorpay_plan_id, // ✅ Use variant's plan_id (determines amount)
      customer_notify: 1,
      total_count: total_deliveries,
      quantity: quantity,
      notes: {
        user_id: user.id,
        product_id: product_id,
        variant_id: variant_id,
        delivery_date: preferred_delivery_date,
      },
    };

    console.log("📤 Creating Razorpay subscription (immediate start):", {
      plan_id: variant.razorpay_plan_id,
      plan_amount: planAmountRupees,
      quantity: quantity,
      total_count: total_deliveries,
    });

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify(subscriptionPayload),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("❌ Razorpay API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create subscription", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const razorpaySubscription = await razorpayResponse.json();

    console.log("✅ Razorpay subscription created:", razorpaySubscription.id);

    // Save to pending_subscriptions table
    const pendingSubscriptionData = {
      razorpay_subscription_id: razorpaySubscription.id,
      user_id: user.id,
      product_id: product_id,
      variant_id: variant_id,
      quantity: quantity,
      preferred_delivery_date: preferred_delivery_date,
      total_deliveries: total_deliveries,
      shipping_address: shipping_address,
    };

    const { data: pendingSubscription, error: dbError } = await supabaseAdmin
      .from("pending_subscriptions")
      .insert(pendingSubscriptionData)
      .select()
      .single();

    if (dbError) {
      console.error("❌ Failed to save pending subscription:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save subscription", details: dbError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Pending subscription saved:", pendingSubscription.id);

    // ============================================
    // DELIVERY SCHEDULING (APPLICATION-LEVEL ONLY)
    // --------------------------------------------
    // IMPORTANT: Razorpay handles BILLING only. Our application owns
    // DELIVERY scheduling via the subscription_deliveries table.
    // First payment = first delivery. Future deliveries are configurable
    // per billing cycle.
    // ============================================
    const firstDeliveryDate = new Date();
    firstDeliveryDate.setDate(firstDeliveryDate.getDate() + 1); // today + 1 day

    const firstDeliveryPayload = {
      subscription_id: pendingSubscription.id, // initially link to pending subscription
      cycle_number: 1,
      delivery_date: firstDeliveryDate.toISOString().slice(0, 10), // YYYY-MM-DD
      status: "scheduled",
    };

    const { error: deliveryError } = await supabaseAdmin
      .from("subscription_deliveries")
      .insert(firstDeliveryPayload);

    if (deliveryError) {
      console.error("❌ Failed to create first delivery schedule:", deliveryError);
      return new Response(
        JSON.stringify({
          error: "Failed to create first delivery schedule",
          details: deliveryError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ First delivery scheduled for subscription:", {
      subscription_id: pendingSubscription.id,
      delivery_date: firstDeliveryPayload.delivery_date,
      cycle_number: firstDeliveryPayload.cycle_number,
    });

    return new Response(
      JSON.stringify({
        razorpay_subscription_id: razorpaySubscription.id,
        razorpay_key_id: razorpayKeyId,
        short_url: razorpaySubscription.short_url,
        pending_subscription_id: pendingSubscription.id,
        plan_amount: planAmountRupees, // For display purposes only
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-razorpay-subscription:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
