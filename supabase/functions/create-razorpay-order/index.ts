import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateOrderRequest {
  amount: number;
  isPartialCod?: boolean;
  checkoutData?: string;
}

interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { amount, isPartialCod = false, checkoutData }: CreateOrderRequest = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valid amount is required" }),
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
        JSON.stringify({
          error: "Payment gateway not configured. Please contact support.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const receiptId = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const amountInPaise = Math.round(amount * 100);

    console.log("Creating Razorpay order:", {
      amount: amountInPaise,
      receipt: receiptId,
      isPartialCod,
    });

    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: receiptId,
        notes: {
          is_partial_cod: isPartialCod ? "true" : "false",
          order_type: isPartialCod ? "cod_advance" : "prepaid",
          checkout_data: checkoutData || "",
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay API error:", errorText);
      
      return new Response(
        JSON.stringify({
          error: "Failed to create payment order. Please try again.",
        }),
        {
          status: razorpayResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const razorpayOrder: RazorpayOrderResponse = await razorpayResponse.json();

    console.log("Razorpay order created:", razorpayOrder.id);

    return new Response(
      JSON.stringify({
        razorpayOrderId: razorpayOrder.id,
        razorpayKeyId: razorpayKeyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-razorpay-order:", error);
    
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
