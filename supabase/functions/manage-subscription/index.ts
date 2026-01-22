import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Max-Age": "86400",
};

interface ManageSubscriptionRequest {
  subscriptionId: string;
  action: "pause" | "resume" | "cancel";
  pauseUntil?: string; // ISO date string for pause (optional, defaults to 1 month)
  user_id?: string; // Optional: for fallback validation if JWT fails
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body first to get user_id (for fallback validation)
    let requestData: ManageSubscriptionRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("Supabase environment variables not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    let user: any = null;
    let userError: any = null;

    // PRIORITY 1: If user_id is provided in request body, use it (most reliable)
    if (requestData.user_id) {
      console.log("🔐 [manage-subscription] Using user_id from request:", requestData.user_id);
      try {
        const { data: userData, error: userLookupError } = await supabaseAdmin.auth.admin.getUserById(requestData.user_id);
        
        if (userData?.user && !userLookupError) {
          console.log("✅ [manage-subscription] User validated via user_id:", userData.user.id);
          user = { id: userData.user.id, email: userData.user.email };
        } else {
          console.error("❌ [manage-subscription] User_id validation failed:", userLookupError);
        }
      } catch (fallbackError) {
        console.error("❌ [manage-subscription] User_id validation error:", fallbackError);
      }
    }

    // PRIORITY 2: Try JWT validation if Authorization header is present and user_id didn't work
    if (!user && authHeader) {
      const token = authHeader.replace("Bearer ", "").trim();
      
      if (token) {
        console.log("🔐 [manage-subscription] Validating token (fallback):", {
          hasToken: !!token,
          tokenPrefix: token.substring(0, 30) + "...",
        });

        const authResult = await supabaseAdmin.auth.getUser(token);
        user = authResult.data.user;
        userError = authResult.error;

        if (userError || !user) {
          console.error("❌ [manage-subscription] JWT validation failed:", {
            error: userError,
            errorMessage: userError?.message,
          });
        } else {
          console.log("✅ [manage-subscription] User authenticated via JWT:", user.id);
        }
      }
    }

    if (!user) {
      console.error("❌ [manage-subscription] All authentication methods failed. Request data:", {
        hasUserId: !!requestData.user_id,
        userId: requestData.user_id,
        hasAuthHeader: !!authHeader,
        action: requestData.action,
      });
      return new Response(
        JSON.stringify({ 
          error: "Authentication failed",
          details: userError?.message || "No valid authentication method found",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
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

    // Get subscription from database (use admin client for DB operations)
    const { data: subscription, error: subError } = await supabaseAdmin
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

    // Update database (use admin client for DB operations)
    const { error: updateError } = await supabaseAdmin
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
