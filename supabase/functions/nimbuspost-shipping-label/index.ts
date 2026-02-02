import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getNimbuspostToken, NIMBUSPOST_CONFIG, corsHeaders } from "../_shared/nimbuspost-utils.ts";

const corsHeadersLocal = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeadersLocal });
  }

  try {
    const url = new URL(req.url);
    const awb = url.searchParams.get("awb");
    if (!awb) {
      return new Response(
        JSON.stringify({ error: "AWB number required" }),
        { status: 400, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
      );
    }

    const token = await getNimbuspostToken();
    const response = await fetch(
      `${NIMBUSPOST_CONFIG.baseURL}/shipments/label?awb_number=${encodeURIComponent(awb)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("[Nimbuspost] Label fetch failed:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Failed to fetch label" }),
        { status: 502, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
      );
    }

    const blob = await response.blob();
    return new Response(blob, {
      status: 200,
      headers: {
        ...corsHeadersLocal,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="label-${awb}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[Nimbuspost] Label error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Label fetch failed" }),
      { status: 500, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
    );
  }
});
