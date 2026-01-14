import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  checkoutData: string;
}

interface CheckoutData {
  user_id: string;
  subtotal: number;
  total_amount: number;
  shipping_address: Record<string, string>;
  pincode: string;
  shipping_region: string;
  shipping_charge: number;
  payment_type: "prepaid" | "cod";
  cod_advance_paid?: number;
  cod_handling_fee?: number;
  cod_balance?: number;
  promotion_id?: string;
  discount_amount?: number;
  items: Array<{
    product_name: string;
    product_id?: string;
    weight: number;
    grind_type?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    variant_id?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      checkoutData,
    }: VerifyPaymentRequest = await req.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return new Response(
        JSON.stringify({
          error: "Missing required payment verification fields",
          verified: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!checkoutData) {
      return new Response(
        JSON.stringify({
          error: "Missing checkout data",
          verified: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!razorpayKeySecret) {
      console.error("Razorpay secret key not configured");
      throw new Error("Payment gateway not configured");
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(razorpayKeySecret);
    const messageData = encoder.encode(body);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpaySignature) {
      console.error("Payment signature verification failed");
      return new Response(
        JSON.stringify({
          error: "Invalid payment signature",
          verified: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Payment signature verified successfully");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const checkout: CheckoutData = JSON.parse(checkoutData);

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, order_number, payment_status")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();

    if (existingOrder) {
      console.log("Order already exists:", existingOrder.id);
      return new Response(
        JSON.stringify({
          verified: true,
          message: "Payment already processed",
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          paymentStatus: existingOrder.payment_status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paymentStatus = checkout.payment_type === "cod" ? "advance_paid" : "paid";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: checkout.user_id,
        order_number: "",
        subtotal: checkout.subtotal,
        total_amount: checkout.total_amount,
        shipping_address: checkout.shipping_address,
        pincode: checkout.pincode,
        shipping_region: checkout.shipping_region,
        shipping_amount: checkout.shipping_charge,
        shipping_charge: checkout.shipping_charge,
        payment_type: checkout.payment_type,
        payment_method:
          checkout.payment_type === "cod" ? "Cash on Delivery" : "Online Payment",
        cod_advance_paid: checkout.cod_advance_paid || 0,
        cod_handling_fee: checkout.cod_handling_fee || 0,
        cod_balance: checkout.cod_balance || 0,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        payment_status: paymentStatus,
        payment_verified: true,
        payment_verified_at: new Date().toISOString(),
        status: "confirmed",
        promotion_id: checkout.promotion_id || null,
        discount_amount: checkout.discount_amount || 0,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    console.log("Order created:", order.id);

    if (checkout.items && checkout.items.length > 0) {
      const orderItems = checkout.items.map((item) => ({
        order_id: order.id,
        product_name: item.product_name,
        product_id: item.product_id || null,
        weight: item.weight,
        grind_type: item.grind_type || "Whole Bean",
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        variant_id: item.variant_id || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Order items creation error:", itemsError);
      } else {
        console.log(`Created ${orderItems.length} order items`);
      }
    }

    if (checkout.promotion_id) {
      const { error: promoError } = await supabase.rpc(
        "increment_promotion_usage",
        { promotion_id: checkout.promotion_id }
      );

      if (promoError) {
        console.error("Failed to increment promotion usage:", promoError);
      }
    }

    return new Response(
      JSON.stringify({
        verified: true,
        message: "Payment verified and order created successfully",
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: paymentStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in verify-razorpay-payment:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        verified: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
