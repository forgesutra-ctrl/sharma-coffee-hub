import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateSubscriptionRequest {
  razorpay_plan_id: string; // Razorpay plan ID from products.razorpay_plan_id
  productId: string;
  variantId?: string;
  quantity: number;
  preferredDeliveryDate: number;
  totalDeliveries: number;
  shippingAddress: Record<string, string>;
  amount: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get Authorization header (Bearer token from supabase.functions.invoke())
    const authHeader = req.headers.get("Authorization");
    const apikey = req.headers.get("apikey") || req.headers.get("x-api-key");
    
    console.log("Auth check:", {
      hasAuthHeader: !!authHeader,
      hasApikey: !!apikey,
      authHeaderPrefix: authHeader?.substring(0, 20) || "none",
    });

    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header. Please log in and try again." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with auth header
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user from token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError) {
      console.error("User verification error:", userError);
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${userError.message}` }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!user) {
      console.error("No user found in token");
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please log in and try again." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("User authenticated:", user.id);

    const requestData: CreateSubscriptionRequest = await req.json();
    const {
      razorpay_plan_id,
      productId,
      variantId,
      quantity,
      preferredDeliveryDate,
      totalDeliveries,
      shippingAddress,
      amount,
    } = requestData;

    if (!razorpay_plan_id || !productId || !quantity || !preferredDeliveryDate || !shippingAddress || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (preferredDeliveryDate < 1 || preferredDeliveryDate > 28) {
      return new Response(
        JSON.stringify({ error: "Delivery date must be between 1 and 28" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("Razorpay credentials not configured");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate razorpay_plan_id is provided (single source of truth from products table)
    if (!razorpay_plan_id || typeof razorpay_plan_id !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid Razorpay plan ID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const calculateStartDate = (dayOfMonth: number): number => {
      const now = new Date();
      const currentDay = now.getDate();
      let startDate: Date;

      if (dayOfMonth > currentDay) {
        startDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
      }

      return Math.floor(startDate.getTime() / 1000);
    };

    const startTimestamp = calculateStartDate(preferredDeliveryDate);

    console.log("Creating Razorpay subscription:", {
      plan_id: razorpay_plan_id,
      total_count: totalDeliveries,
      start_at: startTimestamp,
      quantity,
    });

    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify({
        plan_id: razorpay_plan_id,
        customer_notify: 1,
        total_count: totalDeliveries,
        quantity: quantity,
        start_at: startTimestamp,
        notes: {
          user_id: user.id,
          product_id: productId,
          variant_id: variantId || "",
          delivery_date: preferredDeliveryDate,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay API error:", errorText);

      return new Response(
        JSON.stringify({ error: "Failed to create subscription" }),
        {
          status: razorpayResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const razorpaySubscription = await razorpayResponse.json();

    console.log("Razorpay subscription created:", razorpaySubscription.id);

    const calculateNextDeliveryDate = (dayOfMonth: number): string => {
      const now = new Date();
      const currentDay = now.getDate();
      let deliveryDate: Date;

      if (dayOfMonth > currentDay) {
        deliveryDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
      } else {
        deliveryDate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
      }

      return deliveryDate.toISOString().split("T")[0];
    };

    // Note: plan_id is optional in user_subscriptions - we store razorpay_plan_id directly
    const { data: subscription, error: dbError } = await supabaseClient
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        razorpay_subscription_id: razorpaySubscription.id,
        product_id: productId,
        variant_id: variantId || null,
        quantity: quantity,
        status: "pending",
        preferred_delivery_date: preferredDeliveryDate,
        next_delivery_date: calculateNextDeliveryDate(preferredDeliveryDate),
        next_billing_date: calculateNextDeliveryDate(preferredDeliveryDate),
        total_deliveries: totalDeliveries,
        completed_deliveries: 0,
        shipping_address: shippingAddress,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save subscription" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        subscriptionId: subscription.id,
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayKeyId: razorpayKeyId,
        shortUrl: razorpaySubscription.short_url,
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
