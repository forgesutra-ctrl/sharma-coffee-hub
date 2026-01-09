import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, dtdcStreamCall } from "../_shared/dtdc-utils.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const awb = url.searchParams.get('awb');

    if (!awb) {
      return new Response(
        JSON.stringify({ success: false, error: 'AWB is required' }),
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
      const errorText = await response.text();
      console.error('[DTDC] Label fetch failed:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to fetch label: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
