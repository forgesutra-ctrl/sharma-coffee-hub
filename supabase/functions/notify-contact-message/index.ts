import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Telegram alert for a new /contact enquiry. Called by the contact_messages AFTER INSERT
// trigger (public.notify_contact_message) via pg_net, with only the row id in the body.
// Deployed with verify_jwt = false (config.toml): it needs no caller credentials because it
// only acts on a real, recent, not-yet-alerted row, which it reads with the service role.
//
// - Same bot and chat as the checkout reconciliation alerts (reconcile-checkout-sessions).
// - One-shot: the row is claimed with a single conditional UPDATE (alerted_at IS NULL and
//   created in the last 10 minutes) before anything is sent, so concurrent or replayed
//   requests for the same id cannot send twice. If Telegram fails, the claim is released.
// - Every request gets the same 200 {"ok":true}, whether the id is missing, stale, already
//   alerted or new, so callers learn nothing about which ids exist.
// - Never logs the enquiry's text: the row is the record. Logs carry ids and status codes only.

const TELEGRAM_CHAT_ID = "6906500438";
const MAX_AGE_MS = 10 * 60 * 1000;

const done = () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return done();

  let id: unknown;
  try {
    ({ id } = await req.json());
  } catch {
    return done();
  }
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return done();

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) {
    console.warn(`notify-contact-message: TELEGRAM_BOT_TOKEN not set; no alert for ${id}`);
    return done();
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // Claim: only one request can flip alerted_at from NULL, and only for a fresh row.
  const claimedAt = new Date().toISOString();
  const { data: row } = await supabase
    .from("contact_messages")
    .update({ alerted_at: claimedAt })
    .eq("id", id)
    .is("alerted_at", null)
    .gte("created_at", new Date(Date.now() - MAX_AGE_MS).toISOString())
    .select("id, name, subject, message, phone")
    .maybeSingle();

  if (!row) return done(); // missing, stale or already alerted: nothing to send

  const siteUrl = (Deno.env.get("SITE_URL") ?? "https://www.sharmacoffeeworks.com").replace(/\/$/, "");
  const firstLine = row.message.split(/\r?\n/).find((l: string) => l.trim())?.trim() ?? "";
  const preview = firstLine.length > 200 ? `${firstLine.slice(0, 200)}…` : firstLine;

  const lines = [
    "<b>New enquiry from the website</b>",
    "",
    `<b>From:</b> ${escapeHtml(row.name)}`,
    `<b>Subject:</b> ${escapeHtml(row.subject)}`,
    row.phone ? `<b>Phone / WhatsApp:</b> ${escapeHtml(row.phone)}` : null,
    "",
    escapeHtml(preview),
    "",
    `<a href="${siteUrl}/admin/enquiries">Open in admin → Enquiries</a>`,
  ].filter((l) => l !== null);

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: lines.join("\n"), parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => null);

  if (!tg || !tg.ok) {
    console.error(`notify-contact-message: Telegram send failed for ${id} (status ${tg?.status ?? "network error"})`);
    // Release the claim so the row is not marked alerted when no alert went out.
    await supabase.from("contact_messages").update({ alerted_at: null }).eq("id", id).eq("alerted_at", claimedAt);
  }
  return done();
});
