import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
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

// Validate AWB/reference format (alphanumeric, reasonable length)
function isValidReference(ref: string): boolean {
  return /^[a-zA-Z0-9\-_]{1,50}$/.test(ref);
}

// Sanitize string input
function sanitizeString(input: string, maxLength: number = 200): string {
  return input.replace(/[<>'"]/g, '').substring(0, maxLength).trim();
}

// Verify admin authentication
async function verifyAdminAuth(req: Request): Promise<{ success: boolean; error?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { success: false, error: 'Unauthorized' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return { success: false, error: 'Invalid token' };
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError || !roleData) {
    return { success: false, error: 'Access denied' };
  }

  // Allow super_admin, admin, and staff
  const allowedRoles = ['super_admin', 'admin', 'staff', 'shop_staff'];
  if (!allowedRoles.includes(roleData.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  return { success: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(req);
    if (!authResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreateConsignmentRequest = await req.json();
    const config = getDTDCConfig();

    // Validate required fields
    if (!body.orderId || !body.customerName || !body.phone || !body.address || !body.pincode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate order ID format
    if (!isValidReference(body.orderId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid order ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone format (Indian phone: 10 digits)
    if (!/^[6-9]\d{9}$/.test(body.phone.replace(/\D/g, ''))) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate pincode (Indian pincode: 6 digits)
    if (!/^\d{6}$/.test(body.pincode)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid pincode format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(body.customerName, 100);
    const sanitizedAddress = sanitizeString(body.address, 500);
    const sanitizedCity = sanitizeString(body.city, 100);
    const sanitizedState = sanitizeString(body.state, 100);

    // Build DTDC payload with sanitized data
    const dtdcPayload = {
      service_type_id: "B2C PRIORITY",
      load_type: "NON-DOCUMENT",
      customer_reference_number: body.orderId,
      consignee_name: sanitizedName,
      consignee_phone: body.phone.replace(/\D/g, ''),
      destination_details: {
        address_line_1: sanitizedAddress,
        pincode: body.pincode,
        city: sanitizedCity,
        state: sanitizedState,
      },
      dimension_unit: "cm",
      weight_unit: "kg",
      length: Math.max(1, Math.min(body.dimensionsCm?.length || 10, 200)),
      width: Math.max(1, Math.min(body.dimensionsCm?.width || 10, 200)),
      height: Math.max(1, Math.min(body.dimensionsCm?.height || 10, 200)),
      weight: Math.max(0.1, Math.min(body.weightKg || 0.5, 50)),
      declared_value: Math.max(0, body.totalValue),
      is_risk_surcharge_applicable: false,
      invoice_date: formatInvoiceDate(),
      invoice_number: body.orderId,
      num_pieces: body.items?.reduce((sum, item) => sum + Math.max(1, item.quantity), 0) || 1,
      item_description: body.items?.map(item => sanitizeString(item.name, 50)).join(', ') || 'Coffee Products',
      cod_collection_mode: body.isCOD ? "cash" : undefined,
      cod_amount: body.isCOD ? Math.max(0, body.codAmount || 0) : undefined,
      customer_code: config.customerCode,
    };

    console.log('[DTDC] Creating consignment for order:', body.orderId);

    const result = await dtdcApiCall<{ reference_number?: string; message?: string }>(
      '/api/customer/integration/consignment/softdata',
      { method: 'POST', body: dtdcPayload }
    );

    if (!result.success) {
      console.error('[DTDC] Consignment creation failed:', result.error, result.details);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create shipment. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const awb = result.data.reference_number;
    if (!awb) {
      console.error('[DTDC] No AWB received:', result.data);
      return new Response(
        JSON.stringify({ success: false, error: 'Shipment creation incomplete. Please contact support.' }),
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
      JSON.stringify({ success: false, error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
