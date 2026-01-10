import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getDTDCConfig, getCachedTracking, setCachedTracking } from "../_shared/dtdc-utils.ts";

interface TrackingEvent {
  status: string;
  date: string;
  location: string;
  description?: string;
}

interface TrackingResponse {
  currentStatus: string;
  lastUpdatedDate: string;
  lastLocation: string;
  history: TrackingEvent[];
}

// Validate AWB format (alphanumeric, reasonable length)
function isValidAWB(awb: string): boolean {
  return /^[a-zA-Z0-9]{8,20}$/.test(awb);
}

// Verify user authentication (any authenticated user can track their orders)
async function verifyAuth(req: Request): Promise<{ success: boolean; userId?: string; error?: string }> {
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

  return { success: true, userId: user.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authResult = await verifyAuth(req);
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

    // Check cache first
    const cached = getCachedTracking(awb);
    if (cached) {
      return new Response(
        JSON.stringify(cached),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = getDTDCConfig();
    console.log('[DTDC] Tracking AWB:', awb);

    // Call DTDC tracking API
    const response = await fetch(`${config.baseUrl}/api/customer/integration/consignment/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': config.trackingToken,
      },
      body: JSON.stringify({ reference_number: awb }),
    });

    const responseText = await response.text();
    console.log('[DTDC] Tracking response status:', response.status);

    if (!response.ok) {
      console.error('[DTDC] Tracking failed:', response.status, responseText);
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to track shipment. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('[DTDC] Invalid tracking response format');
      return new Response(
        JSON.stringify({ success: false, error: 'Tracking information unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse tracking data into standardized format
    const history: TrackingEvent[] = (data.tracking_history || data.scans || []).map((event: Record<string, unknown>) => ({
      status: String(event.status || event.scan_type || 'Unknown'),
      date: String(event.date || event.scan_datetime || event.timestamp || ''),
      location: String(event.location || event.city || event.origin || ''),
      description: String(event.description || event.remarks || ''),
    }));

    const latestEvent = history[0] || {};
    const trackingResult: TrackingResponse = {
      currentStatus: String(data.current_status || latestEvent.status || 'Unknown'),
      lastUpdatedDate: String(data.last_updated || latestEvent.date || ''),
      lastLocation: String(data.current_location || latestEvent.location || ''),
      history,
    };

    // Cache for 15 minutes
    setCachedTracking(awb, trackingResult, 15);

    console.log('[DTDC] Tracking successful. Status:', trackingResult.currentStatus);

    return new Response(
      JSON.stringify(trackingResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[DTDC] Error tracking:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
