import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, dtdcStreamCall } from "../_shared/dtdc-utils.ts";

// Validate AWB format (alphanumeric, reasonable length)
function isValidAWB(awb: string): boolean {
  return /^[a-zA-Z0-9]{8,20}$/.test(awb);
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
    .eq('role', 'admin')
    .single();

  if (roleError || !roleData) {
    return { success: false, error: 'Admin access required' };
  }

  return { success: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const url = new URL(req.url);
    const awb = url.searchParams.get('awb');

    if (!awb) {
      return new Response(
        JSON.stringify({ success: false, error: 'AWB is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate AWB format
    if (!isValidAWB(awb)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid AWB format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DTDC] Fetching shipping label for AWB:', awb);

    const response = await dtdcStreamCall(
      '/api/customer/integration/consignment/shippinglabel/stream',
      {
        reference_number: awb,
        label_code: 'SHIP_LABEL_4X6',
        label_format: 'pdf',
      }
    );

    if (!response.ok) {
      console.error('[DTDC] Label fetch failed:', response.status);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch shipping label. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream the PDF directly
    const pdfBuffer = await response.arrayBuffer();

    console.log('[DTDC] Shipping label fetched successfully. Size:', pdfBuffer.byteLength);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="shipping-label-${awb}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[DTDC] Error fetching shipping label:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
