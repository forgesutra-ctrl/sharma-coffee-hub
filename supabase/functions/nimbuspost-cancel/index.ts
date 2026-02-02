import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { nimbuspostRequest, corsHeaders } from "../_shared/nimbuspost-utils.ts";

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

    const data = await nimbuspostRequest("/shipments/cancel", {
      method: "POST",
      body: { awb: String(awb) } as unknown as Record<string, unknown>,
    });

    const success = (data as { status?: boolean }).status === true;
    return new Response(
      JSON.stringify({
        success,
        message: (data as { message?: string }).message || (success ? "Shipment cancelled" : "Cancellation failed"),
      }),
      { status: 200, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Nimbuspost] Cancel error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Cancellation failed",
      }),
      { status: 500, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
    );
  }
});
