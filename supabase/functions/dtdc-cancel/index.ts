import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, dtdcApiCall, getDTDCConfig } from "../_shared/dtdc-utils.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const awb = body.awb;

    if (!awb) {
      return new Response(
        JSON.stringify({ success: false, error: 'AWB is required' }),
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
      return new Response(
        JSON.stringify({ success: false, error: result.error, details: result.details }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[DTDC] Cancellation successful for AWB:', awb);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: result.data.message || 'Consignment cancelled successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[DTDC] Error cancelling consignment:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
