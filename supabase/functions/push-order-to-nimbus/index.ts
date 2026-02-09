/**
 * Push order to Nimbus Post with weight and full details.
 *
 * Authentication: NIMBUS_API_KEY (header NP-API-KEY). Set in Edge Function secrets.
 * POST .../api/orders/create as multipart/form-data.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getNimbusApiKey, NIMBUSPOST_CONFIG } from "../_shared/nimbuspost-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ShippingAddress {
  fullName?: string;
  full_name?: string;
  address_line1?: string;
  addressLine1?: string;
  address_line2?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
}

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  weight?: number;
}

interface PushOrderRequest {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: ShippingAddress & Record<string, unknown>;
  orderItems: OrderItem[];
  totalWeight: number;
  orderAmount: number;
  paymentType: "prepaid" | "cod";
  codAmount?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: PushOrderRequest = await req.json();

    const apiKey = (Deno.env.get("NIMBUS_API_KEY") || "").trim();
    if (!apiKey) {
      console.log("[Nimbus] Not configured. Set NIMBUS_API_KEY in Edge Function secrets.");
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: "Nimbus not configured. Set NIMBUS_API_KEY in Supabase Dashboard → Project Settings → Edge Functions → Secrets.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const addr = body.shippingAddress || {};
    const addressLine1 = addr.address_line1 || addr.addressLine1 || "";
    const addressLine2 = addr.address_line2 || addr.addressLine2 || "";
    const fullAddress = addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1;

    const weightKg = body.totalWeight && body.totalWeight > 0 ? body.totalWeight : 0.5;
    const lengthCm = 20;
    const widthCm = 15;
    const heightCm = 10;
    const consigneeName = body.customerName || addr.fullName || addr.full_name || "Customer";
    const nameParts = consigneeName.trim().split(/\s+/);
    const fname = nameParts[0] || "Customer";
    const lname = nameParts.slice(1).join(" ") || "";
    const paymentMethod = (body.paymentType || "prepaid").toLowerCase() === "cod" ? "COD" : "prepaid";

    const form = new FormData();
    form.append("order_number", body.orderNumber);
    form.append("payment_method", paymentMethod);
    form.append("amount", String(body.orderAmount ?? 0));
    form.append("fname", fname);
    form.append("lname", lname);
    form.append("address", fullAddress || addressLine1);
    form.append("phone", (body.customerPhone || addr.phone || "").replace(/\D/g, "").slice(-10));
    form.append("city", addr.city || "");
    form.append("state", addr.state || "");
    form.append("country", "India");
    form.append("pincode", addr.pincode || "");
    form.append("weight", String(Math.round(weightKg * 1000)));
    form.append("length", String(lengthCm));
    form.append("height", String(heightCm));
    form.append("breadth", String(widthCm));

    const items = body.orderItems || [];
    items.forEach((item, i) => {
      form.append(`products[${i}][name]`, item.product_name || "");
      form.append(`products[${i}][qty]`, String(item.quantity ?? 1));
      form.append(`products[${i}][price]`, String(item.unit_price ?? 0));
    });

    console.log("[Nimbus] Creating order...");
    let data: unknown;
    try {
      const apiKey = getNimbusApiKey();
      const url = `${NIMBUSPOST_CONFIG.baseURL}/orders/create`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "NP-API-KEY": apiKey,
        },
        body: form,
      });
      const responseText = await response.text();
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = responseText;
      }
      if (!response.ok) {
        throw new Error((data as { message?: string })?.message || `Nimbuspost API error: ${response.status}`);
      }
    } catch (err) {
      console.error("[Nimbus] Create order failed:", err);
      return new Response(
        JSON.stringify({
          success: false,
          error: err instanceof Error ? err.message : "Nimbuspost API error",
          message: "Check NIMBUS_API_KEY in Edge Function secrets.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = data as Record<string, unknown> | null;
    const hasBodyError = res && (
      res.success === false ||
      res.status === false ||
      res.status === "error" ||
      res.status === "failed" ||
      res.error != null
    );
    const apiErrorMsg = res && (res.error ?? res.message ?? res.msg);
    if (hasBodyError && apiErrorMsg) {
      const msgStr = typeof apiErrorMsg === "string" ? apiErrorMsg : JSON.stringify(apiErrorMsg);
      console.error("[Nimbus] API returned 200 but error in body:", msgStr);
      return new Response(
        JSON.stringify({
          success: false,
          error: msgStr,
          details: JSON.stringify(res).slice(0, 500),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Nimbus] Order pushed successfully:", body.orderNumber);
    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Nimbus] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
