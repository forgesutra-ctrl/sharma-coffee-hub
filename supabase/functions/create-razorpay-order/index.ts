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

    // STEP 7: Store order before payment (if checkoutData provided)
    const checkoutData = rawBody?.checkoutData as {
      user_id?: string;
      subtotal?: number;
      total_amount?: number;
      shipping_address?: Record<string, any>;
      pincode?: string;
      shipping_region?: string;
      shipping_charge?: number;
      payment_type?: "prepaid" | "cod";
      cod_advance_paid?: number;
      cod_handling_fee?: number;
      cod_balance?: number;
      promotion_id?: string | null;
      discount_amount?: number;
      items?: Array<{
        product_name: string;
        product_id?: string;
        weight: number;
        quantity: number;
        unit_price: number;
        total_price: number;
        variant_id?: string | null;
      }>;
    } | null;

    if (checkoutData?.user_id && checkoutData?.items?.length) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const normalizedShippingAddress = checkoutData.shipping_address ? { ...checkoutData.shipping_address } : {};
        if (normalizedShippingAddress.phone) {
          const phoneDigits = String(normalizedShippingAddress.phone).replace(/\D/g, "");
          if (phoneDigits.length === 12 && phoneDigits.startsWith("91")) {
            normalizedShippingAddress.phone = phoneDigits.substring(2);
          } else if (phoneDigits.length === 10) {
            normalizedShippingAddress.phone = phoneDigits;
          }
        }

        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: checkoutData.user_id,
            order_number: orderNumber,
            status: "pending_payment",
            payment_status: "pending",
            subtotal: checkoutData.subtotal ?? checkoutData.total_amount ?? 0,
            total_amount: checkoutData.total_amount ?? amountRupees,
            shipping_address: normalizedShippingAddress,
            pincode: checkoutData.pincode ?? null,
            shipping_region: checkoutData.shipping_region ?? null,
            shipping_charge: checkoutData.shipping_charge ?? 0,
            payment_type: checkoutData.payment_type ?? "prepaid",
            cod_advance_paid: checkoutData.cod_advance_paid ?? 0,
            cod_handling_fee: checkoutData.cod_handling_fee ?? 0,
            cod_balance: checkoutData.cod_balance ?? 0,
            razorpay_order_id: razorpayOrder.id,
            payment_method: checkoutData.payment_type === "cod" ? "Cash on Delivery" : "Online Payment",
            promotion_id: checkoutData.promotion_id ?? null,
            discount_amount: checkoutData.discount_amount ?? 0,
          })
          .select("id")
          .single();

        if (!orderError && order) {
          const orderItems = checkoutData.items!.map((item) => ({
            order_id: order.id,
            product_name: item.product_name,
            product_id: item.product_id ?? null,
            weight: typeof item.weight === "number" ? item.weight : 250,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            variant_id: item.variant_id ?? null,
          }));
          const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
          if (itemsError) {
            console.error("❌ Failed to create order items, rolling back order:", itemsError);
            await supabase.from("orders").delete().eq("id", order.id);
          } else {
            console.log("✅ Order created before payment:", order.id, "razorpay_order_id:", razorpayOrder.id);
          }
        } else if (orderError) {
          console.error("❌ Failed to create order before payment:", orderError);
        }
      }
    }

    // STEP 8: Return clean JSON response (frontend expects camelCase)
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
