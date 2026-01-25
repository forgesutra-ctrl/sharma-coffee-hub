import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

/**
 * Recovery function to find and create missing orders from Razorpay
 * This function checks Razorpay for captured payments that don't have corresponding orders
 * 
 * Usage: Call this function periodically (e.g., via cron) to catch missing orders
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!supabaseUrl || !supabaseServiceKey || !razorpayKeyId || !razorpayKeySecret) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    // Get date range (last 7 days by default, or from query params)
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "7");
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);

    console.log(`🔍 Checking for missing orders from last ${days} days (since ${fromDate.toISOString()})`);

    // Fetch payments from Razorpay API
    const paymentsResponse = await fetch(
      `https://api.razorpay.com/v1/payments?from=${fromTimestamp}&count=100`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${authString}`,
        },
      }
    );

    if (!paymentsResponse.ok) {
      const errorText = await paymentsResponse.text();
      throw new Error(`Failed to fetch payments from Razorpay: ${errorText}`);
    }

    const paymentsData = await paymentsResponse.json();
    const payments = paymentsData.items || [];

    console.log(`📊 Found ${payments.length} payments from Razorpay`);

    // Filter for captured payments only
    const capturedPayments = payments.filter((p: any) => p.status === "captured");
    console.log(`✅ Found ${capturedPayments.length} captured payments`);

    // Check which payments don't have orders
    const missingOrders: any[] = [];
    
    for (const payment of capturedPayments) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, order_number")
        .eq("razorpay_payment_id", payment.id)
        .maybeSingle();

      if (!existingOrder) {
        missingOrders.push(payment);
        console.log(`❌ Missing order for payment: ${payment.id} (₹${payment.amount / 100})`);
      }
    }

    console.log(`📋 Found ${missingOrders.length} missing orders`);

    // Return report (don't auto-create orders - requires manual review)
    return new Response(
      JSON.stringify({
        success: true,
        total_payments: payments.length,
        captured_payments: capturedPayments.length,
        missing_orders: missingOrders.length,
        missing_payments: missingOrders.map((p: any) => ({
          payment_id: p.id,
          amount: p.amount / 100,
          currency: p.currency,
          status: p.status,
          created_at: p.created_at,
          customer: {
            contact: p.contact,
            email: p.email,
          },
          notes: p.notes,
        })),
        message: "Review missing_payments and create orders manually using the create-missing-order scripts",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in recover-missing-orders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
