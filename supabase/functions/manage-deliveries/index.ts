import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Max-Age": "86400",
};

const CUTOFF_DAYS = 3;

type ManageDeliveriesAction = "list" | "update_date" | "skip" | "admin_update_status";

interface ManageDeliveriesRequest {
  action: ManageDeliveriesAction;
  deliveryId?: string;
  newDate?: string; // ISO date string (YYYY-MM-DD)
  newStatus?: "scheduled" | "delivered" | "skipped";
  user_id?: string; // Optional: for fallback validation if JWT fails
}

// Helper to compute difference in days between two dates (date-only comparison)
function daysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Parse request body first to get user_id (for fallback validation)
    let requestData: ManageDeliveriesRequest;
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
      console.log("🔐 [manage-deliveries] Using user_id from request:", requestData.user_id);
      try {
        const { data: userData, error: userLookupError } = await supabaseAdmin.auth.admin.getUserById(requestData.user_id);
        
        if (userData?.user && !userLookupError) {
          console.log("✅ [manage-deliveries] User validated via user_id:", userData.user.id);
          user = { id: userData.user.id, email: userData.user.email };
        } else {
          console.error("❌ [manage-deliveries] User_id validation failed:", userLookupError);
        }
      } catch (fallbackError) {
        console.error("❌ [manage-deliveries] User_id validation error:", fallbackError);
      }
    }

    // PRIORITY 2: Try JWT validation if Authorization header is present and user_id didn't work
    if (!user && authHeader) {
      const token = authHeader.replace("Bearer ", "").trim();
      
      if (token) {
        // Debug: Log token info (first 30 chars only)
        const tokenPreview = token.substring(0, 30) + "...";
        console.log("🔐 [manage-deliveries] Validating token (fallback):", {
          hasToken: !!token,
          tokenPrefix: tokenPreview,
          tokenLength: token.length,
        });

        const authResult = await supabaseAdmin.auth.getUser(token);
        user = authResult.data.user;
        userError = authResult.error;

        if (userError || !user) {
          console.error("❌ [manage-deliveries] JWT validation failed:", {
            error: userError,
            errorMessage: userError?.message,
            errorCode: userError?.status,
            errorName: userError?.name,
            hasUser: !!user,
          });
        } else {
          console.log("✅ [manage-deliveries] User authenticated via JWT:", user.id);
        }
      }
    }

    if (!user) {
      console.error("❌ [manage-deliveries] All authentication methods failed. Request data:", {
        hasUserId: !!requestData.user_id,
        userId: requestData.user_id,
        hasAuthHeader: !!authHeader,
        action: requestData.action,
      });
      return new Response(
        JSON.stringify({ 
          code: 401, 
          message: "Authentication failed", 
          details: userError?.message || "No valid authentication method found",
          hint: "Please ensure you are logged in and try again"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // requestData was already parsed above, extract action and other fields
    const { action, deliveryId, newDate, newStatus } = requestData;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ========== ACTION: LIST UPCOMING DELIVERIES ==========
    if (action === "list") {
      // Query both pending_subscriptions (for unpaid) and user_subscriptions (for active)
      // to get all subscriptions for this user
      const [pendingSubsResult, activeSubsResult] = await Promise.all([
        supabaseAdmin
          .from("pending_subscriptions")
          .select("id, user_id, product_id, variant_id, quantity, shipping_address")
          .eq("user_id", user.id),
        supabaseAdmin
          .from("user_subscriptions")
          .select("id, user_id, product_id, variant_id, quantity, shipping_address")
          .eq("user_id", user.id)
          .in("status", ["active", "pending"]),
      ]);

      const allSubs = [
        ...(pendingSubsResult.data || []),
        ...(activeSubsResult.data || []),
      ];

      if (pendingSubsResult.error) {
        console.error("❌ Error fetching pending subscriptions:", pendingSubsResult.error);
      }
      if (activeSubsResult.error) {
        console.error("❌ Error fetching active subscriptions:", activeSubsResult.error);
      }

      // If both queries failed, return error
      if (pendingSubsResult.error && activeSubsResult.error) {
        console.error("❌ Error fetching subscriptions for deliveries");
        return new Response(
          JSON.stringify({ error: "Failed to load subscriptions" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const subscriptionIds = allSubs.map((s) => s.id);

      if (subscriptionIds.length === 0) {
        return new Response(
          JSON.stringify({ deliveries: [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Fetch deliveries for these subscriptions
      let { data: deliveries, error: deliveriesError } = await supabaseAdmin
        .from("subscription_deliveries")
        .select("*")
        .in("subscription_id", subscriptionIds)
        .order("delivery_date", { ascending: true });

      // Also check if there are deliveries linked to user_subscriptions via razorpay_subscription_id
      // This handles the case where subscription was activated via webhook
      const { data: userSubs } = await supabaseAdmin
        .from("user_subscriptions")
        .select("id, razorpay_subscription_id")
        .eq("user_id", user.id)
        .not("razorpay_subscription_id", "is", null);

      if (userSubs && userSubs.length > 0) {
        const userSubIds = userSubs.map(s => s.id);
        const { data: additionalDeliveries } = await supabaseAdmin
          .from("subscription_deliveries")
          .select("*")
          .in("subscription_id", userSubIds)
          .order("delivery_date", { ascending: true });

        // Merge deliveries, avoiding duplicates
        const allDeliveryIds = new Set((deliveries || []).map(d => d.id));
        deliveries = [
          ...(deliveries || []),
          ...(additionalDeliveries || []).filter(d => !allDeliveryIds.has(d.id))
        ];
      }

      if (deliveriesError) {
        console.error("❌ Error fetching subscription_deliveries:", deliveriesError);
        return new Response(
          JSON.stringify({ error: "Failed to load deliveries" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Fetch product info for all subscriptions
      const productInfoPromises = allSubs.map(async (sub) => {
        const [productResult, variantResult] = await Promise.all([
          sub.product_id ? supabaseAdmin
            .from("products")
            .select("name")
            .eq("id", sub.product_id)
            .maybeSingle() : Promise.resolve({ data: null }),
          sub.variant_id ? supabaseAdmin
            .from("product_variants")
            .select("weight")
            .eq("id", sub.variant_id)
            .maybeSingle() : Promise.resolve({ data: null }),
        ]);
        return {
          subId: sub.id,
          product_name: productResult.data?.name ?? null,
          quantity: sub.quantity ?? null,
          weight: variantResult.data?.weight ?? null,
        };
      });
      
      const productInfoArray = await Promise.all(productInfoPromises);
      const productInfoMap = new Map(productInfoArray.map(info => [info.subId, info]));

      // Join in memory to enrich deliveries with product info
      const enriched = (deliveries || []).map((delivery) => {
        const info = productInfoMap.get(delivery.subscription_id) || {};
        return {
          id: delivery.id,
          subscription_id: delivery.subscription_id,
          cycle_number: delivery.cycle_number,
          delivery_date: delivery.delivery_date,
          status: delivery.status,
          created_at: delivery.created_at,
          product_name: info.product_name ?? null,
          quantity: info.quantity ?? null,
          weight: info.weight ?? null,
        };
      });

      return new Response(
        JSON.stringify({ deliveries: enriched }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ========== ACTIONS: UPDATE_DATE / SKIP / ADMIN_UPDATE_STATUS ==========
    if (!deliveryId) {
      return new Response(
        JSON.stringify({ error: "deliveryId is required for this action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch delivery with its subscription to validate ownership and rules
    const { data: delivery, error: deliveryError } = await supabaseAdmin
      .from("subscription_deliveries")
      .select("id, subscription_id, cycle_number, delivery_date, status")
      .eq("id", deliveryId)
      .maybeSingle();

    if (deliveryError || !delivery) {
      console.error("❌ Delivery not found:", deliveryError);
      return new Response(
        JSON.stringify({ error: "Delivery not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: sub, error: subError } = await supabaseAdmin
      .from("pending_subscriptions")
      .select("id, user_id")
      .eq("id", delivery.subscription_id)
      .maybeSingle();

    if (subError || !sub) {
      console.error("❌ Subscription not found for delivery:", subError);
      return new Response(
        JSON.stringify({ error: "Subscription not found for delivery" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isOwner = sub.user_id === user.id;

    // Admin override: we treat admin users via a simple claim (optional, can be tightened later)
    const isAdmin = (user.user_metadata?.role === "admin" || user.user_metadata?.is_admin === true) ?? false;

    if (!isOwner && !(action === "admin_update_status" && isAdmin)) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Admin-only status update
    if (action === "admin_update_status") {
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Admin privileges required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!newStatus) {
        return new Response(
          JSON.stringify({ error: "newStatus is required for admin_update_status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("subscription_deliveries")
        .update({ status: newStatus })
        .eq("id", delivery.id);

      if (updateError) {
        console.error("❌ Failed to update delivery status (admin):", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update delivery status" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // User-managed actions: update_date / skip
    // Business rules:
    // - cycle_number >= 2
    // - status = 'scheduled'
    // - today < (delivery_date - cutoff_days)
    if (delivery.cycle_number < 2) {
      return new Response(
        JSON.stringify({ error: "First delivery cannot be modified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (delivery.status !== "scheduled") {
      return new Response(
        JSON.stringify({ error: "Only scheduled deliveries can be changed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const today = new Date();
    const currentDeliveryDate = new Date(delivery.delivery_date);
    const daysUntil = daysBetween(today, currentDeliveryDate);

    if (daysUntil <= CUTOFF_DAYS) {
      return new Response(
        JSON.stringify({
          error: `Changes are only allowed more than ${CUTOFF_DAYS} days before delivery`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "update_date") {
      if (!newDate) {
        return new Response(
          JSON.stringify({ error: "newDate is required for update_date" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const newDeliveryDate = new Date(newDate);
      if (Number.isNaN(newDeliveryDate.getTime())) {
        return new Response(
          JSON.stringify({ error: "Invalid newDate format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const daysUntilNew = daysBetween(today, newDeliveryDate);
      if (daysUntilNew <= CUTOFF_DAYS) {
        return new Response(
          JSON.stringify({
            error: `New delivery date must be at least ${CUTOFF_DAYS + 1} days from today`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("subscription_deliveries")
        .update({ delivery_date: newDate })
        .eq("id", delivery.id);

      if (updateError) {
        console.error("❌ Failed to update delivery date:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update delivery date" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "skip") {
      const { error: updateError } = await supabaseAdmin
        .from("subscription_deliveries")
        .update({ status: "skipped" })
        .eq("id", delivery.id);

      if (updateError) {
        console.error("❌ Failed to skip delivery:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to skip delivery" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unsupported action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Error in manage-deliveries:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

