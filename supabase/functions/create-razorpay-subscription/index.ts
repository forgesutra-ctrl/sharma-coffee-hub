import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateSubscriptionRequest {
  planId: string;
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const requestData: CreateSubscriptionRequest = await req.json();
    const {
      planId,
      productId,
      variantId,
      quantity,
      preferredDeliveryDate,
      totalDeliveries,
      shippingAddress,
      amount,
    } = requestData;

    if (!planId || !productId || !quantity || !preferredDeliveryDate || !shippingAddress || !amount) {
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

    const { data: plan } = await supabaseClient
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    if (!plan || !plan.razorpay_plan_id) {
      return new Response(
        JSON.stringify({ error: "Invalid subscription plan" }),
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
      plan_id: plan.razorpay_plan_id,
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
        plan_id: plan.razorpay_plan_id,
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

    const { data: subscription, error: dbError } = await supabaseClient
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        razorpay_subscription_id: razorpaySubscription.id,
        plan_id: planId,
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
