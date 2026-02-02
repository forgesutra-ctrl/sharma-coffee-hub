import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  nimbuspostRequest,
  NIMBUSPOST_CONFIG,
} from "../_shared/nimbuspost-utils.ts";

const corsHeadersLocal = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateShipmentRequest {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    phone: string;
  };
  orderItems: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    weight?: number;
  }>;
  totalWeight: number;
  orderAmount: number;
  paymentType: "prepaid" | "cod";
  codAmount?: number;
  shippingCharges?: number;
  discount?: number;
}

function calculateWeight(
  items: CreateShipmentRequest["orderItems"],
  providedWeight?: number
): number {
  if (providedWeight && providedWeight > 0) {
    return Math.max(0.5, Math.min(providedWeight, 50));
  }
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedWeight = totalItems * 0.25;
  return Math.max(0.5, Math.min(estimatedWeight, 50));
}

function sanitizeString(input: string, maxLength: number = 200): string {
  return input.replace(/[<>'"]/g, "").substring(0, maxLength).trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeadersLocal });
  }

  try {
    const shipmentData: CreateShipmentRequest = await req.json();

    if (!shipmentData.orderId || !shipmentData.customerName || !shipmentData.shippingAddress) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: orderId, customerName, shippingAddress",
        }),
        { status: 400, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, nimbuspost_awb_number, order_number")
      .eq("id", shipmentData.orderId)
      .maybeSingle();

    if (!existingOrder) {
      return new Response(
        JSON.stringify({ success: false, error: "Order not found" }),
        { status: 404, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
      );
    }

    if (existingOrder.nimbuspost_awb_number) {
      console.log(
        `[Nimbuspost] Shipment already exists for order ${shipmentData.orderId}, AWB: ${existingOrder.nimbuspost_awb_number}`
      );
      return new Response(
        JSON.stringify({
          success: true,
          awbNumber: existingOrder.nimbuspost_awb_number,
          orderId: shipmentData.orderId,
          trackingUrl: `https://${NIMBUSPOST_CONFIG.trackingDomain}/${existingOrder.nimbuspost_awb_number}`,
          message: "Shipment already created",
        }),
        { status: 200, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
      );
    }

    const phone = (shipmentData.customerPhone || shipmentData.shippingAddress.phone || "")
      .replace(/\D/g, "")
      .slice(-10);
    if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid phone number. Must be 10 digits starting with 6-9",
        }),
        { status: 400, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
      );
    }

    const pincode = shipmentData.shippingAddress.pincode.replace(/\D/g, "");
    if (pincode.length !== 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid pincode. Must be 6 digits" }),
        { status: 400, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
      );
    }

    const weightKg = calculateWeight(shipmentData.orderItems, shipmentData.totalWeight);
    const itemCount = shipmentData.orderItems.reduce((s, i) => s + (i.quantity || 1), 0);
    const dimensions =
      itemCount <= 1
        ? { length: 15, breadth: 10, height: 10 }
        : itemCount <= 3
          ? { length: 20, breadth: 15, height: 10 }
          : { length: 25, breadth: 20, height: 15 };

    const payload = {
      order_number: existingOrder.order_number || shipmentData.orderId.substring(0, 30),
      shipping_charges: Number(shipmentData.shippingCharges ?? 0),
      discount: Number(shipmentData.discount ?? 0),
      cod_charges: shipmentData.paymentType === "cod" ? Number(shipmentData.codAmount ?? 0) : 0,
      payment_type: shipmentData.paymentType,
      order_amount: Number(shipmentData.orderAmount),
      package_weight: weightKg,
      package_length: dimensions.length,
      package_breadth: dimensions.breadth,
      package_height: dimensions.height,
      consignee: {
        name: sanitizeString(shipmentData.customerName, 100),
        address: sanitizeString(shipmentData.shippingAddress.addressLine1, 200),
        address_2: shipmentData.shippingAddress.addressLine2
          ? sanitizeString(shipmentData.shippingAddress.addressLine2, 200)
          : "",
        city: sanitizeString(shipmentData.shippingAddress.city, 100),
        state: sanitizeString(shipmentData.shippingAddress.state, 100),
        pincode,
        phone,
      },
      pickup: NIMBUSPOST_CONFIG.warehouse,
      order_items: shipmentData.orderItems.map((item) => ({
        name: sanitizeString(item.product_name, 100),
        qty: Math.max(1, item.quantity),
        price: Number(item.unit_price),
        sku: "SKU-" + sanitizeString(item.product_name, 10),
      })),
      courier_id: "",
      collectable_amount:
        shipmentData.paymentType === "cod" ? Number(shipmentData.orderAmount) : 0,
    };

    console.log(`[Nimbuspost] Creating shipment for order: ${shipmentData.orderId}`);

    const data = await nimbuspostRequest<{
      awb_number?: string;
      courier_id?: number;
      courier_name?: string;
      label?: string;
      shipment_id?: string;
    }>("/shipments", { method: "POST", body: payload as unknown as Record<string, unknown> });

    if (!data.status || !data.data) {
      throw new Error((data as { message?: string }).message || "Shipment creation failed");
    }

    const awbNumber = data.data.awb_number;
    if (!awbNumber) {
      throw new Error("No AWB received from Nimbuspost");
    }

    const trackingUrl = `https://${NIMBUSPOST_CONFIG.trackingDomain}/${awbNumber}`;

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        nimbuspost_awb_number: awbNumber,
        nimbuspost_courier_name: data.data.courier_name ?? null,
        nimbuspost_tracking_url: trackingUrl,
        shipment_created_at: new Date().toISOString(),
      })
      .eq("id", shipmentData.orderId);

    if (updateError) {
      console.error("[Nimbuspost] Failed to save AWB to database:", updateError);
    } else {
      console.log(`[Nimbuspost] AWB saved to order: ${awbNumber}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        awbNumber,
        orderId: shipmentData.orderId,
        trackingUrl,
        courierName: data.data.courier_name,
        labelUrl: data.data.label,
      }),
      { status: 200, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Nimbuspost] Error creating shipment:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
    );
  }
});
