import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, dtdcApiCall, formatInvoiceDate, getDTDCConfig } from "../_shared/dtdc-utils.ts";

interface CreateConsignmentRequest {
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalValue: number;
  weightKg: number;
  dimensionsCm: { length: number; width: number; height: number };
  isCOD: boolean;
  codAmount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateConsignmentRequest = await req.json();
    const config = getDTDCConfig();

    // Validate required fields
    if (!body.orderId || !body.customerName || !body.phone || !body.address || !body.pincode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build DTDC payload
    const dtdcPayload = {
      service_type_id: "B2C PRIORITY",
      load_type: "NON-DOCUMENT",
      customer_reference_number: body.orderId,
      consignee_name: body.customerName,
      consignee_phone: body.phone,
      destination_details: {
        address_line_1: body.address,
        pincode: body.pincode,
        city: body.city,
        state: body.state,
      },
      dimension_unit: "cm",
      weight_unit: "kg",
      length: body.dimensionsCm?.length || 10,
      width: body.dimensionsCm?.width || 10,
      height: body.dimensionsCm?.height || 10,
      weight: body.weightKg || 0.5,
      declared_value: body.totalValue,
      is_risk_surcharge_applicable: false,
      invoice_date: formatInvoiceDate(),
      invoice_number: body.orderId,
      num_pieces: body.items?.reduce((sum, item) => sum + item.quantity, 0) || 1,
      item_description: body.items?.map(item => item.name).join(', ') || 'Coffee Products',
      cod_collection_mode: body.isCOD ? "cash" : undefined,
      cod_amount: body.isCOD ? body.codAmount : undefined,
      customer_code: config.customerCode,
    };

    console.log('[DTDC] Creating consignment for order:', body.orderId);

    const result = await dtdcApiCall<{ reference_number?: string; message?: string }>(
      '/api/customer/integration/consignment/softdata',
      { method: 'POST', body: dtdcPayload }
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error, details: result.details }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const awb = result.data.reference_number;
    if (!awb) {
      return new Response(
        JSON.stringify({ success: false, error: 'No AWB received from DTDC', details: result.data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DTDC] Consignment created successfully. AWB:', awb);

    return new Response(
      JSON.stringify({ success: true, awb, orderId: body.orderId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[DTDC] Error creating consignment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
