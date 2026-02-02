import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, nimbuspostRequest, SHIPPING_STATUS_MAP } from "../_shared/nimbuspost-utils.ts";

const corsHeadersLocal = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeadersLocal });
  }

  try {
    const { awb } = await req.json();
    if (!awb) {
      return new Response(
        JSON.stringify({ success: false, error: "AWB number required" }),
        { status: 400, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
      );
    }

    const data = await nimbuspostRequest<{
      awb?: string;
      current_status?: string;
      courier_name?: string;
      etd?: string;
      history?: Array<{
        status: string;
        location?: string;
        date: string;
        time: string;
        remarks?: string;
      }>;
      last_update_date?: string;
    }>("/shipments/track", { queryParams: { awb_number: String(awb) } });

    if (!data.status || !data.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: (data as { message?: string }).message || "Tracking not available",
        }),
        { status: 200, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
      );
    }

    const tracking = data.data;
    const history = (tracking.history || [])
      .map((event) => ({
        status: event.status,
        location: event.location,
        date: event.date,
        time: event.time,
        description: event.remarks,
        timestamp: new Date(`${event.date} ${event.time}`).toISOString(),
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const lastEvent = (tracking.history || [])[0];
    return new Response(
      JSON.stringify({
        success: true,
        currentStatus: tracking.current_status,
        mappedStatus: SHIPPING_STATUS_MAP[tracking.current_status || ""] || "processing",
        courierName: tracking.courier_name,
        estimatedDelivery: tracking.etd,
        lastUpdatedDate: tracking.last_update_date,
        lastLocation: lastEvent?.location ?? "",
        history,
      }),
      { status: 200, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Nimbuspost] Tracking error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unable to fetch tracking",
      }),
      { status: 500, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
    );
  }
});
