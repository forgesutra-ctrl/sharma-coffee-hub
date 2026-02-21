import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Subscription events go to razorpay-subscription-webhook; all others to razorpay-webhook
const SUBSCRIPTION_EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.completed",
  "subscription.payment_failed",
]);

function getWebhookUrl(eventType: string, supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  if (SUBSCRIPTION_EVENTS.has(eventType)) {
    return `${base}/functions/v1/razorpay-subscription-webhook`;
  }
  return `${base}/functions/v1/razorpay-webhook`;
}

function calculateNextRetry(retryCount: number): Date {
  const delaySeconds = 60 * Math.pow(2, retryCount);
  return new Date(Date.now() + delaySeconds * 1000);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const queueSecret = Deno.env.get("PROCESS_WEBHOOK_QUEUE_SECRET");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(
      JSON.stringify({ error: "Configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Fetch rows ready for retry: next_retry_at <= now, not yet failed
    const { data: rows, error: fetchError } = await supabaseAdmin
      .from("webhook_queue")
      .select("id, event_type, payload, retry_count, max_retries")
      .is("processed_at", null)
      .is("failed_at", null)
      .lte("next_retry_at", new Date().toISOString());

    if (fetchError) {
      console.error("❌ Error fetching queue:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eligibleRows = (rows ?? []).filter(
      (r) => (r.retry_count ?? 0) < (r.max_retries ?? 5)
    );

    if (eligibleRows.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No items to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    for (const row of eligibleRows) {
      const webhookUrl = getWebhookUrl(row.event_type, supabaseUrl);
      const payload = row.payload as Record<string, unknown>;
      const body = JSON.stringify(payload);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      };

      // Internal retry bypass - webhooks accept this header to skip Razorpay signature verification
      if (queueSecret) {
        headers["X-Internal-Queue-Retry"] = queueSecret;
      }

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body,
        });

        if (res.ok) {
          await supabaseAdmin.from("webhook_queue").delete().eq("id", row.id);
          processed++;
          console.log(`✅ Processed webhook queue id=${row.id} event=${row.event_type}`);
        } else {
          const errText = await res.text();
          const newRetryCount = (row.retry_count ?? 0) + 1;
          const nextRetryAt = calculateNextRetry(newRetryCount);

          if (newRetryCount >= (row.max_retries ?? 5)) {
            await supabaseAdmin
              .from("webhook_queue")
              .update({
                failed_at: new Date().toISOString(),
                last_error: `HTTP ${res.status}: ${errText.slice(0, 500)}`,
              })
              .eq("id", row.id);
            console.error(`❌ Permanently failed webhook queue id=${row.id} after ${newRetryCount} retries`);
          } else {
            await supabaseAdmin
              .from("webhook_queue")
              .update({
                retry_count: newRetryCount,
                last_error: `HTTP ${res.status}: ${errText.slice(0, 500)}`,
                next_retry_at: nextRetryAt.toISOString(),
              })
              .eq("id", row.id);
            console.warn(`⚠️ Retry scheduled for webhook queue id=${row.id} (attempt ${newRetryCount + 1})`);
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const newRetryCount = (row.retry_count ?? 0) + 1;
        const nextRetryAt = calculateNextRetry(newRetryCount);

        if (newRetryCount >= (row.max_retries ?? 5)) {
          await supabaseAdmin
            .from("webhook_queue")
            .update({
              failed_at: new Date().toISOString(),
              last_error: errMsg.slice(0, 500),
            })
            .eq("id", row.id);
          console.error(`❌ Permanently failed webhook queue id=${row.id}:`, errMsg);
        } else {
          await supabaseAdmin
            .from("webhook_queue")
            .update({
              retry_count: newRetryCount,
              last_error: errMsg.slice(0, 500),
              next_retry_at: nextRetryAt.toISOString(),
            })
            .eq("id", row.id);
          console.warn(`⚠️ Retry scheduled for webhook queue id=${row.id}:`, errMsg);
        }
      }
    }

    return new Response(
      JSON.stringify({ processed, total: eligibleRows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in process-webhook-queue:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
