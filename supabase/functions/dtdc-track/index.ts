import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    console.log('[DTDC] Tracking response:', responseText.substring(0, 500));

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Tracking failed: ${response.status}`, details: responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid tracking response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse tracking data into standardized format
    const history: TrackingEvent[] = (data.tracking_history || data.scans || []).map((event: Record<string, unknown>) => ({
      status: event.status || event.scan_type || 'Unknown',
      date: event.date || event.scan_datetime || event.timestamp || '',
      location: event.location || event.city || event.origin || '',
      description: event.description || event.remarks || '',
    }));

    const latestEvent = history[0] || {};
    const trackingResult: TrackingResponse = {
      currentStatus: data.current_status || latestEvent.status || 'Unknown',
      lastUpdatedDate: data.last_updated || latestEvent.date || '',
      lastLocation: data.current_location || latestEvent.location || '',
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
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
