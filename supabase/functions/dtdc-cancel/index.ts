import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, dtdcApiCall, getDTDCConfig } from "../_shared/dtdc-utils.ts";

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

    const body = await req.json();
    const awb = body.awb;

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

    const config = getDTDCConfig();
    console.log('[DTDC] Cancelling consignment. AWB:', awb);

    const result = await dtdcApiCall<{ message?: string; success?: boolean }>(
      '/api/customer/integration/consignment/cancel',
      {
        method: 'POST',
        body: {
          customerCode: config.customerCode,
          reference_number: awb,
        },
      }
    );

    if (!result.success) {
      console.error('[DTDC] Cancellation failed:', result.error, result.details);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to cancel shipment. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DTDC] Cancellation successful for AWB:', awb);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Consignment cancelled successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[DTDC] Error cancelling consignment:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
