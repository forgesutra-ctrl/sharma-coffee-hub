/**
 * Cleanup abandoned orders: cancels orders with status 'pending_payment' older than 24 hours.
 * Call via cron (e.g. daily) or manually.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const CUTOFF_HOURS = 24;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Configuration missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const cutoff = new Date(Date.now() - CUTOFF_HOURS * 60 * 60 * 1000).toISOString();

    const { data: toCancel, error: selectError } = await supabase
      .from("orders")
      .select("id, order_number, created_at")
      .eq("status", "pending_payment")
      .lt("created_at", cutoff);

    if (selectError) {
      console.error("❌ Error selecting pending_payment orders:", selectError);
      return new Response(
        JSON.stringify({ error: selectError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ids = (toCancel ?? []).map((o) => o.id);
    if (ids.length === 0) {
      return new Response(
        JSON.stringify({ cancelled: 0, message: "No abandoned orders to cancel" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .in("id", ids)
      .select("id, order_number");

    if (updateError) {
      console.error("❌ Error cancelling orders:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const count = updated?.length ?? ids.length;
    console.log(`✅ Cancelled ${count} abandoned orders (pending_payment > ${CUTOFF_HOURS}h)`);

    return new Response(
      JSON.stringify({
        cancelled: count,
        order_ids: updated?.map((o) => o.id) ?? ids,
        message: `Cancelled ${count} abandoned order(s)`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Cleanup error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
