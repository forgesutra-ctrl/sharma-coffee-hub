import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, dtdcApiCall, formatInvoiceDate, getDTDCConfig } from "../_shared/dtdc-utils.ts";

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
  totalWeight: number; // in kg
  orderAmount: number;
  paymentType: "prepaid" | "cod";
  codAmount?: number;
}

// Calculate total weight from items or use provided weight
function calculateWeight(items: CreateShipmentRequest["orderItems"], providedWeight?: number): number {
  if (providedWeight && providedWeight > 0) {
    return Math.max(0.1, Math.min(providedWeight, 50)); // Clamp between 0.1kg and 50kg
  }
  
  // Default weight calculation: 250g per item
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedWeight = (totalItems * 0.25); // 250g per item
  return Math.max(0.1, Math.min(estimatedWeight, 50));
}

// Sanitize string input
function sanitizeString(input: string, maxLength: number = 200): string {
  return input.replace(/[<>'"]/g, '').substring(0, maxLength).trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeadersLocal,
    });
  }

  try {
    const shipmentData: CreateShipmentRequest = await req.json();

    // Validate required fields
    if (!shipmentData.orderId || !shipmentData.customerName || !shipmentData.shippingAddress) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: orderId, customerName, shippingAddress",
        }),
        {
          status: 400,
          headers: { ...corsHeadersLocal, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if shipment already exists for this order
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, dtdc_awb_number, order_number")
      .eq("id", shipmentData.orderId)
      .maybeSingle();

    if (!existingOrder) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Order not found",
        }),
        {
          status: 404,
          headers: { ...corsHeadersLocal, "Content-Type": "application/json" },
        }
      );
    }

    // If AWB already exists, return it
    if (existingOrder.dtdc_awb_number) {
      console.log(`[DTDC] Shipment already exists for order ${shipmentData.orderId}, AWB: ${existingOrder.dtdc_awb_number}`);
      return new Response(
        JSON.stringify({
          success: true,
          awbNumber: existingOrder.dtdc_awb_number,
          orderId: shipmentData.orderId,
          message: "Shipment already created",
        }),
        {
          status: 200,
          headers: { ...corsHeadersLocal, "Content-Type": "application/json" },
        }
      );
    }

    const config = getDTDCConfig();

    // Validate phone format (Indian phone: 10 digits)
    const phoneDigits = shipmentData.customerPhone.replace(/\D/g, '');
    if (phoneDigits.length !== 10 || !/^[6-9]/.test(phoneDigits)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid phone number format. Must be 10 digits starting with 6-9",
        }),
        {
          status: 400,
          headers: { ...corsHeadersLocal, "Content-Type": "application/json" },
        }
      );
    }

    // Validate pincode (Indian pincode: 6 digits)
    if (!/^\d{6}$/.test(shipmentData.shippingAddress.pincode)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid pincode format. Must be 6 digits",
        }),
        {
          status: 400,
          headers: { ...corsHeadersLocal, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate weight
    const weightKg = calculateWeight(shipmentData.orderItems, shipmentData.totalWeight);
    
    // Calculate dimensions (default: 20x15x10 cm for coffee packages)
    const dimensions = {
      length: 20,
      width: 15,
      height: 10,
    };

    // Build address string
    const addressLine1 = sanitizeString(shipmentData.shippingAddress.addressLine1, 200);
    const addressLine2 = shipmentData.shippingAddress.addressLine2 
      ? sanitizeString(shipmentData.shippingAddress.addressLine2, 200)
      : '';
    const fullAddress = addressLine2 
      ? `${addressLine1}, ${addressLine2}`
      : addressLine1;

    // Build DTDC payload
    const dtdcPayload = {
      service_type_id: "B2C PRIORITY",
      load_type: "NON-DOCUMENT",
      customer_reference_number: existingOrder.order_number || shipmentData.orderId.substring(0, 20),
      consignee_name: sanitizeString(shipmentData.customerName, 100),
      consignee_phone: phoneDigits,
      destination_details: {
        address_line_1: fullAddress.substring(0, 200),
        pincode: shipmentData.shippingAddress.pincode,
        city: sanitizeString(shipmentData.shippingAddress.city, 100),
        state: sanitizeString(shipmentData.shippingAddress.state, 100),
      },
      dimension_unit: "cm",
      weight_unit: "kg",
      length: dimensions.length,
      width: dimensions.width,
      height: dimensions.height,
      weight: weightKg,
      declared_value: Math.max(0, shipmentData.orderAmount),
      is_risk_surcharge_applicable: false,
      invoice_date: formatInvoiceDate(),
      invoice_number: existingOrder.order_number || shipmentData.orderId.substring(0, 20),
      num_pieces: shipmentData.orderItems.reduce((sum, item) => sum + Math.max(1, item.quantity), 0),
      item_description: shipmentData.orderItems
        .map(item => sanitizeString(item.product_name, 50))
        .join(', ')
        .substring(0, 200) || 'Coffee Products',
      cod_collection_mode: shipmentData.paymentType === "cod" ? "cash" : undefined,
      cod_amount: shipmentData.paymentType === "cod" 
        ? Math.max(0, shipmentData.codAmount || shipmentData.orderAmount * 0.9) 
        : undefined,
      customer_code: config.customerCode,
    };

    console.log(`[DTDC] Creating shipment for order: ${shipmentData.orderId}`);

    // Call DTDC API
    const result = await dtdcApiCall<{ reference_number?: string; message?: string; error?: string }>(
      '/api/customer/integration/consignment/softdata',
      { method: 'POST', body: dtdcPayload }
    );

    if (!result.success) {
      console.error('[DTDC] Shipment creation failed:', result.error, result.details);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Failed to create shipment',
          details: result.details,
        }),
        {
          status: 500,
          headers: { ...corsHeadersLocal, "Content-Type": "application/json" },
        }
      );
    }

    const awbNumber = result.data.reference_number;
    if (!awbNumber) {
      console.error('[DTDC] No AWB received:', result.data);
      return new Response(
        JSON.stringify({
          success: false,
          error: result.data.error || result.data.message || 'Shipment creation incomplete. No AWB received.',
          details: result.data,
        }),
        {
          status: 500,
          headers: { ...corsHeadersLocal, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[DTDC] Shipment created successfully. AWB: ${awbNumber}`);

    // Save AWB to order
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        dtdc_awb_number: awbNumber,
        shipment_created_at: new Date().toISOString(),
      })
      .eq("id", shipmentData.orderId);

    if (updateError) {
      console.error('[DTDC] Failed to save AWB to database:', updateError);
      // Still return success since shipment was created, but log the error
    } else {
      console.log(`[DTDC] AWB saved to order: ${awbNumber}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        awbNumber,
        orderId: shipmentData.orderId,
        trackingUrl: `https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${awbNumber}`,
      }),
      {
        status: 200,
        headers: { ...corsHeadersLocal, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('[DTDC] Error creating shipment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeadersLocal, "Content-Type": "application/json" },
      }
    );
  }
});
