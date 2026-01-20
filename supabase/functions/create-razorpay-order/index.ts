import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // For safety we only allow POST for this payment function plus OPTIONS for CORS preflight.
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  price: number; // Price in rupees
}

interface CreateOrderRequest {
  user_id: string;
  access_token: string;
  cart_items: CartItem[];
  shipping_address: Record<string, any>;
  payment_type: "prepaid" | "cod";
  total_amount: number; // Client-calculated total in rupees
  shipping_charge: number;
  cod_handling_fee?: number;
  cod_advance_paid?: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Only POST is allowed for creating orders
  if (req.method !== "POST") {
    console.error("❌ Method not allowed for create-razorpay-order:", req.method);
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Top-level request logging to aid debugging in production
  console.log("💳 [create-razorpay-order] Incoming request:", {
    method: req.method,
    url: req.url,
    contentType: req.headers.get("content-type"),
  });
  try {
    // STEP 3: Safely parse JSON body
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch (err) {
      console.error("❌ Failed to parse JSON body in create-razorpay-order:", err);
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("🧾 [create-razorpay-order] Parsed body:", rawBody);

    // STEP 3: Support multiple payload shapes for amount:
    // - { amount: number }
    // - { data: { amount: number } }
    // - (legacy) { total_amount: number }
    const amountValue =
      rawBody?.amount ??
      rawBody?.data?.amount ??
      rawBody?.total_amount;

    // STEP 4: Normalize amount (in rupees) and convert to paise
    const amountRupees = Number(amountValue);
    if (!Number.isFinite(amountRupees) || amountRupees < 1) {
      console.error("❌ Invalid amount:", { amountValue });
      return new Response(
        JSON.stringify({
          error: "Invalid amount",
          details: "Amount must be at least ₹1 and a valid number.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const amountPaise = Math.round(amountRupees * 100);

    console.log("✅ Normalized amount:", {
      amountRupees,
      amountPaise,
    });

    // STEP 5: Validate Razorpay environment variables
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("❌ Razorpay environment variables missing:", {
        hasKeyId: !!razorpayKeyId,
        hasKeySecret: !!razorpayKeySecret,
      });
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // STEP 6: Create Razorpay order
    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const receiptId = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const razorpayOrderPayload = {
      amount: amountPaise, // paise
      currency: "INR",
      receipt: receiptId,
      payment_capture: 1,
    };

    console.log("📤 Creating Razorpay order with payload:", razorpayOrderPayload);

    let razorpayOrder: any;
    try {
      const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${authString}`,
        },
        body: JSON.stringify(razorpayOrderPayload),
      });

      const responseText = await razorpayResponse.text();

      if (!razorpayResponse.ok) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          // non-JSON error body
        }

        console.error("❌ Razorpay order creation failed:", {
          statusCode: razorpayResponse.status,
          message: parsed?.error?.description || responseText,
          error: parsed?.error || null,
        });

        return new Response(
          JSON.stringify({
            error: "Failed to create payment order",
            razorpayError: parsed?.error || null,
            statusCode: razorpayResponse.status,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      try {
        razorpayOrder = JSON.parse(responseText);
      } catch {
        console.error("❌ Failed to parse Razorpay order response:", responseText);
        return new Response(
          JSON.stringify({
            error: "Invalid response from payment gateway",
            details: "Could not parse Razorpay order response.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (err) {
      console.error("❌ Network/Fetch error while creating Razorpay order:", {
        message: err instanceof Error ? err.message : String(err),
      });
      return new Response(
        JSON.stringify({
          error: "Failed to create payment order",
          details: err instanceof Error ? err.message : String(err),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("✅ Razorpay order created:", razorpayOrder.id);

    // STEP 7: Return clean JSON response (frontend expects camelCase)
    return new Response(
      JSON.stringify({
        order_id: razorpayOrder.id,
        orderId: razorpayOrder.id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount, // paise
        currency: razorpayOrder.currency || "INR",
        razorpay_key_id: razorpayKeyId,
        razorpayKeyId: razorpayKeyId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error in create-razorpay-order:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
