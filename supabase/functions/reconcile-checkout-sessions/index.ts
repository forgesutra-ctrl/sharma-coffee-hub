import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const TELEGRAM_CHAT_ID = "6906500438";

async function sendTelegram(message: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" }),
  }).catch(() => {});
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!serviceKey || token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey ?? "");

  const { data: sessions, error } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("status", "paid")
    .is("order_id", null)
    .not("razorpay_payment_id", "is", null);

  if (error) {
    console.error("[reconcile] Error fetching sessions:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const missed = sessions ?? [];
  let fixed = 0;

  for (const session of missed) {
    const createRes = await fetch(`${supabaseUrl}/functions/v1/create-order-from-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        session_id: session.id,
        razorpay_payment_id: session.razorpay_payment_id,
        from_webhook: true,
      }),
    });
    if (createRes.ok) {
      fixed++;
      console.log("[reconcile] Fixed session:", session.id);
    }
  }

  const summary = `📋 <b>Checkout Reconciliation (${new Date().toISOString().split("T")[0]})</b>\nMissed sessions: ${missed.length}\nFixed: ${fixed}\n${missed.length > fixed ? "⚠️ Some need manual handling" : "✅ All resolved"}`;
  await sendTelegram(summary);

  return new Response(
    JSON.stringify({ missed: missed.length, fixed }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
