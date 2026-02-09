/**
 * Create Nimbus Post shipment for an order by order_id or order_number.
 * Used when Nimbus (or admin) calls this URL to create the shipment with correct weight.
 * Fetches order + order_items from DB, builds payload with weight, and pushes to Nimbus
 * via push-order-to-nimbus (so weight is included).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let orderId: string | null = null;
    let orderNumber: string | null = null;

    const url = new URL(req.url);
    const query = (key: string) =>
      url.searchParams.get(key) || url.searchParams.get(key.toLowerCase()) || null;
    orderId = query("order_id") || query("orderId") || query("id") || orderId;
    orderNumber = query("order_number") || query("orderNumber") || query("order_no") || query("reference") || orderNumber;

    if (req.method === "POST" || req.method === "PUT") {
      let body: Record<string, unknown> = {};
      const ct = req.headers.get("content-type") || "";
      try {
        if (ct.includes("application/json")) {
          body = (await req.json()) as Record<string, unknown> || {};
        } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
          const form = await req.formData();
          body = {
            order_id: form.get("order_id") ?? form.get("orderId"),
            order_number: form.get("order_number") ?? form.get("orderNumber") ?? form.get("order_no"),
            orderId: form.get("orderId"),
            orderNumber: form.get("orderNumber"),
          };
        } else {
          const text = await req.text();
          if (text.trim()) body = JSON.parse(text) as Record<string, unknown>;
        }
      } catch {
        body = {};
      }
      const get = (...keys: string[]) => {
        for (const k of keys) {
          const v = body[k];
          if (v != null && typeof v === "string" && v.trim()) return v.trim();
        }
        const data = body.data as Record<string, unknown> | undefined;
        const order = body.order as Record<string, unknown> | undefined;
        for (const obj of [data, order].filter(Boolean)) {
          for (const k of keys) {
            const v = (obj as Record<string, unknown>)[k];
            if (v != null && typeof v === "string" && v.trim()) return v.trim();
          }
        }
        return null;
      };
      orderId = get("order_id", "orderId", "id") || orderId;
      orderNumber = get("order_number", "orderNumber", "order_no", "reference") || orderNumber;
      const single = get("order");
      if (single && !orderId && !orderNumber) {
        if (/^[0-9a-fA-F-]{36}$/.test(single)) orderId = single;
        else orderNumber = single;
      }
    }

    if (!orderId && !orderNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing order_id or order_number",
          hint: "Send JSON body: { \"order_id\": \"<uuid>\" } or { \"order_number\": \"ORD-...\" }, or use query params ?order_id= or ?order_number=",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const orderQuery = supabase.from("orders").select("id, order_number, total_amount, shipping_address").limit(1);
    if (orderId) orderQuery.eq("id", orderId);
    else orderQuery.eq("order_number", orderNumber);

    const { data: order, error: orderError } = await orderQuery.maybeSingle();
    if (orderError || !order) {
      console.error("[NimbusPost] Order lookup failed:", orderError?.message || "not found");
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("product_name, quantity, unit_price, total_price, weight")
      .eq("order_id", order.id);

    if (itemsError) {
      console.error("[NimbusPost] Order items fetch failed:", itemsError.message);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to load order items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const addr = (order.shipping_address as Record<string, unknown>) || {};
    const fullName = (addr.fullName ?? addr.full_name ?? "Customer") as string;
    const phone = (addr.phone ?? "") as string;
    const email = (addr.email ?? "") as string;

    const totalGrams = (orderItems || []).reduce((sum: number, item: { weight?: number; quantity?: number }) => {
      const w = item.weight && item.weight > 0 ? item.weight : 250;
      return sum + w * (item.quantity || 1);
    }, 0);
    const totalWeightKg = Math.max(0.5, Math.min(50, totalGrams / 1000));

    const nimbusPayload = {
      orderId: order.id,
      orderNumber: order.order_number,
      customerName: fullName,
      customerPhone: phone,
      customerEmail: email,
      shippingAddress: addr,
      orderItems: (orderItems || []).map((item: { product_name?: string; quantity?: number; unit_price?: number; total_price?: number; weight?: number }) => ({
        product_name: item.product_name || "",
        quantity: item.quantity || 0,
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        weight: typeof item.weight === "number" && item.weight > 0 ? item.weight : 250,
      })),
      totalWeight: totalWeightKg,
      orderAmount: Number(order.total_amount) || 0,
      paymentType: "prepaid" as const,
      codAmount: undefined,
    };

    const functionUrl = `${supabaseUrl}/functions/v1/push-order-to-nimbus`;
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(nimbusPayload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[NimbusPost] push-order-to-nimbus failed:", response.status, result);
      return new Response(
        JSON.stringify({
          success: false,
          error: result?.error || `Push failed: ${response.status}`,
          details: result?.details,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (result?.success === false) {
      const errMsg = result?.error || "Nimbus push failed";
      let message = errMsg;
      const details = result?.details;
      if (typeof details === "string") {
        try {
          const parsed = JSON.parse(details) as { message?: string };
          if (parsed?.message) message = parsed.message;
        } catch {
          if (details.length > 0) message = details;
        }
      }
      console.error("[NimbusPost] Nimbus API error:", message, details);
      const hint = result?.hint as string | undefined;
      return new Response(
        JSON.stringify({
          success: false,
          error: message,
          details: details,
          ...(hint && { hint }),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const skipped = result?.skipped === true;
    const nimbusBody = result?.data;
    const nimbusResponseEmpty = !skipped && (nimbusBody == null || nimbusBody === "");
    if (skipped) {
      console.log("[NimbusPost] Order prepared but Nimbus not configured; not sent to Nimbus:", order.order_number);
    } else if (nimbusResponseEmpty) {
      console.warn("[NimbusPost] Nimbus returned 200 but empty body – order may not have been created in Nimbus. Check Nimbus API path and payload.");
    } else {
      console.log("[NimbusPost] Order pushed to Nimbuspost (appears in Orders list; use 'Ship' in Nimbuspost to book AWB):", order.order_number, "weight_kg:", totalWeightKg);
    }
    return new Response(
      JSON.stringify({
        success: true,
        skipped: skipped,
        nimbus_response_empty: nimbusResponseEmpty,
        message: result?.message,
        order_id: order.id,
        order_number: order.order_number,
        weight_kg: totalWeightKg,
        data: result?.data,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[NimbusPost] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
