/**
 * Push order to Nimbus Post with weight and full details.
 * Configure NIMBUS_API_BASE_URL and NIMBUS_API_KEY in Supabase Edge Function secrets.
 * If not set, returns success without calling Nimbus (no-op).
 *
 * Payload sent to Nimbus includes:
 * - order_id, order_number
 * - weight_kg (total order weight so it appears in Nimbus dashboard)
 * - dimensions (length_cm, width_cm, height_cm)
 * - shipping address, customer name, phone, email
 * - items[] with product_name, quantity, weight (grams), unit_price, total_price
 * - payment_type, cod_amount (if COD)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
  totalWeight: number; // kg
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

    const baseUrl = (Deno.env.get("NIMBUS_API_BASE_URL") || "https://api.nimbuspost.com").replace(/\/$/, "");
    const apiKey = Deno.env.get("NIMBUS_API_KEY");
    const ordersPath = Deno.env.get("NIMBUS_API_ORDERS_PATH") || "/v1/order";
    const httpMethod = (Deno.env.get("NIMBUS_API_METHOD") || "POST").toUpperCase();

    if (!baseUrl || !apiKey) {
      const missing = [!baseUrl && "NIMBUS_API_BASE_URL", !apiKey && "NIMBUS_API_KEY"].filter(Boolean).join(", ");
      console.log("[Nimbus] Not configured. Missing:", missing, "- Skipping push.");
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          message: !apiKey
            ? "NIMBUS_API_KEY secret is not set. Add it in Supabase Dashboard → Project Settings → Edge Functions → Secrets (from Nimbus Post → Settings → API → Generate API User Credentials)."
            : "Nimbus not configured",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const addr = body.shippingAddress || {};
    const addressLine1 = addr.address_line1 || addr.addressLine1 || "";
    const addressLine2 = addr.address_line2 || addr.addressLine2 || "";
    const fullAddress = addressLine2 ? `${addressLine1}, ${addressLine2}` : addressLine1;

    const weightKg = body.totalWeight && body.totalWeight > 0 ? body.totalWeight : 0.5;
    const itemsWithWeight = (body.orderItems || []).map((item) => ({
      product_name: item.product_name || "",
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total_price: item.total_price || 0,
      weight: typeof item.weight === "number" && item.weight > 0 ? item.weight : 250,
    }));

    const nimbusPayload = {
      order_id: body.orderId,
      order_number: body.orderNumber,
      weight_kg: weightKg,
      weight: weightKg,
      length_cm: 20,
      width_cm: 15,
      height_cm: 10,
      consignee_name: body.customerName || addr.fullName || addr.full_name || "Customer",
      consignee_phone: (body.customerPhone || addr.phone || "").replace(/\D/g, "").slice(-10),
      consignee_email: body.customerEmail || addr.email || "",
      consignee_address: fullAddress || addressLine1,
      consignee_pincode: addr.pincode || "",
      consignee_city: addr.city || "",
      consignee_state: addr.state || "",
      payment_type: body.paymentType || "prepaid",
      cod_amount: body.paymentType === "cod" ? body.codAmount || 0 : undefined,
      order_amount: body.orderAmount || 0,
      items: itemsWithWeight,
    };

    const url = `${baseUrl}${ordersPath.startsWith("/") ? ordersPath : `/${ordersPath}`}`;
    console.log("[Nimbus] Pushing order to", url, "method:", httpMethod, "weight_kg:", weightKg, "order_number:", body.orderNumber);

    const method = ["GET", "POST", "PUT", "PATCH"].includes(httpMethod) ? httpMethod : "POST";
    const rawToken = apiKey.startsWith("Bearer ") ? apiKey.slice(7).trim() : apiKey;
    // Partners API expects "key=value" in Authorization (must include equal-sign). Use token=<key>; if secret already contains "=" use as-is.
    const authHeader = apiKey.includes("=")
      ? apiKey
      : `token=${rawToken}`;
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(nimbusPayload),
    });

    const responseText = await response.text();
    let data: unknown = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = responseText;
    }

    if (!response.ok) {
      console.error("[Nimbus] Push failed:", response.status, responseText.slice(0, 400));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Nimbus API error: ${response.status}`,
          details: responseText.slice(0, 500),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = data as Record<string, unknown> | null;
    const hasBodyError = res && (res.success === false || res.status === "error" || res.status === "failed" || res.error != null);
    const apiErrorMsg = res && (res.error ?? res.message ?? res.msg);
    if (hasBodyError && apiErrorMsg) {
      console.error("[Nimbus] API returned 200 but error in body:", String(apiErrorMsg), "body:", responseText.slice(0, 300));
      return new Response(
        JSON.stringify({
          success: false,
          error: typeof apiErrorMsg === "string" ? apiErrorMsg : JSON.stringify(apiErrorMsg),
          details: responseText.slice(0, 500),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Nimbus] Order pushed successfully:", body.orderNumber, "| Nimbus response length:", responseText?.length, "| body:", responseText.slice(0, 600));
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
