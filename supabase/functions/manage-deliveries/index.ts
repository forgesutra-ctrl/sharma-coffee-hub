import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CUTOFF_DAYS = 3;

type ManageDeliveriesAction = "list" | "update_date" | "skip" | "admin_update_status";

interface ManageDeliveriesRequest {
  action: ManageDeliveriesAction;
  deliveryId?: string;
  newDate?: string; // ISO date string (YYYY-MM-DD)
  newStatus?: "scheduled" | "delivered" | "skipped";
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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

    // User-scoped client for auth
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for DB operations (service role)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Auth error in manage-deliveries:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const requestData: ManageDeliveriesRequest = await req.json();
    const { action, deliveryId, newDate, newStatus } = requestData;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ========== ACTION: LIST UPCOMING DELIVERIES ==========
    if (action === "list") {
      // We treat pending_subscriptions as the source of truth for active subscriptions.
      // Join it with subscription_deliveries to produce a user-friendly view.
      const { data: subs, error: subsError } = await supabaseAdmin
        .from("pending_subscriptions")
        .select("id, user_id, product_id, variant_id, quantity, shipping_address, products(name), product_variants(weight, price)")
        .eq("user_id", user.id);

      if (subsError) {
        console.error("❌ Error fetching subscriptions for deliveries:", subsError);
        return new Response(
          JSON.stringify({ error: "Failed to load subscriptions" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const subscriptionIds = (subs || []).map((s) => s.id);

      if (subscriptionIds.length === 0) {
        return new Response(
          JSON.stringify({ deliveries: [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: deliveries, error: deliveriesError } = await supabaseAdmin
        .from("subscription_deliveries")
        .select("*")
        .in("subscription_id", subscriptionIds)
        .order("delivery_date", { ascending: true });

      if (deliveriesError) {
        console.error("❌ Error fetching subscription_deliveries:", deliveriesError);
        return new Response(
          JSON.stringify({ error: "Failed to load deliveries" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Join in memory to enrich deliveries with product info
      const enriched = (deliveries || []).map((delivery) => {
        const sub = (subs || []).find((s) => s.id === delivery.subscription_id);
        return {
          id: delivery.id,
          subscription_id: delivery.subscription_id,
          cycle_number: delivery.cycle_number,
          delivery_date: delivery.delivery_date,
          status: delivery.status,
          created_at: delivery.created_at,
          product_name: sub?.products?.name ?? null,
          quantity: sub?.quantity ?? null,
          weight: sub?.product_variants?.weight ?? null,
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

