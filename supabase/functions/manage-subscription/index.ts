import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ManageSubscriptionRequest {
  subscriptionId: string;
  action: "pause" | "resume" | "cancel";
  pauseUntil?: string; // ISO date string for pause (optional, defaults to 1 month)
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

    const requestData: ManageSubscriptionRequest = await req.json();
    const { subscriptionId, action, pauseUntil } = requestData;

    if (!subscriptionId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subscriptionId, action" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!["pause", "resume", "cancel"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be: pause, resume, or cancel" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get subscription from database
    const { data: subscription, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: "Subscription not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!subscription.razorpay_subscription_id) {
      return new Response(
        JSON.stringify({ error: "Subscription not linked to Razorpay" }),
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

    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const razorpaySubscriptionId = subscription.razorpay_subscription_id;

    let razorpayResponse: Response;
    let updateData: Record<string, any> = {};

    switch (action) {
      case "pause": {
        // Calculate pause until date (default: 1 month from now)
        const pauseDate = pauseUntil 
          ? new Date(pauseUntil)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        
        const pauseUntilTimestamp = Math.floor(pauseDate.getTime() / 1000);

        console.log("Pausing subscription:", {
          subscriptionId: razorpaySubscriptionId,
          pauseUntil: pauseUntilTimestamp,
        });

        razorpayResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${razorpaySubscriptionId}/pause`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${authString}`,
            },
            body: JSON.stringify({
              pause_at: "now",
              resume_at: pauseUntilTimestamp,
            }),
          }
        );

        if (razorpayResponse.ok) {
          // Calculate next billing date after resume
          const nextBillingDate = pauseDate.toISOString().split("T")[0];
          updateData = {
            status: "paused",
            next_billing_date: nextBillingDate,
            updated_at: new Date().toISOString(),
          };
        }
        break;
      }

      case "resume": {
        console.log("Resuming subscription:", razorpaySubscriptionId);

        razorpayResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${razorpaySubscriptionId}/resume`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${authString}`,
            },
            body: JSON.stringify({
              resume_at: "now",
            }),
          }
        );

        if (razorpayResponse.ok) {
          // Restore next billing date to preferred delivery date
          const now = new Date();
          const preferredDate = subscription.preferred_delivery_date || 15;
          const currentDay = now.getDate();
          
          let nextBillingDate: Date;
          if (preferredDate > currentDay) {
            nextBillingDate = new Date(now.getFullYear(), now.getMonth(), preferredDate);
          } else {
            nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, preferredDate);
          }

          updateData = {
            status: "active",
            next_billing_date: nextBillingDate.toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          };
        }
        break;
      }

      case "cancel": {
        console.log("Cancelling subscription:", razorpaySubscriptionId);

        razorpayResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${razorpaySubscriptionId}/cancel`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${authString}`,
            },
            body: JSON.stringify({
              cancel_at_cycle_end: false, // Cancel immediately
            }),
          }
        );

        if (razorpayResponse.ok) {
          updateData = {
            status: "cancelled",
            updated_at: new Date().toISOString(),
          };
        }
        break;
      }
    }

    if (!razorpayResponse.ok) {
      const errorText = await razorpayResponse.text();
      console.error("Razorpay API error:", errorText);
      return new Response(
        JSON.stringify({ error: `Failed to ${action} subscription: ${errorText}` }),
        {
          status: razorpayResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update database
    const { error: updateError } = await supabaseClient
      .from("user_subscriptions")
      .update(updateData)
      .eq("id", subscriptionId);

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update subscription in database" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Subscription ${action}d successfully`,
        subscription: {
          id: subscriptionId,
          status: updateData.status || subscription.status,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in manage-subscription:", error);

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
