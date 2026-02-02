import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { nimbuspostRequest, NIMBUSPOST_CONFIG, corsHeaders } from "../_shared/nimbuspost-utils.ts";

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
    const { pincode, paymentType = "prepaid", weight = 0.5 } = await req.json();
    const destination = String(pincode).replace(/\D/g, "");
    if (destination.length !== 6) {
      return new Response(
        JSON.stringify({ serviceable: false, message: "Invalid pincode format" }),
        { status: 400, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
      );
    }

    const data = await nimbuspostRequest<{ length?: number; data?: unknown[]; message?: string }>(
      "/courier/serviceability",
      {
        queryParams: {
          origin: NIMBUSPOST_CONFIG.originPincode,
          destination,
          payment_type: String(paymentType),
          weight: String(Number(weight) || 0.5),
        },
      }
    );

    const couriers = (data.data as unknown[]) || [];
    const serviceable = (data as { status?: boolean }).status && couriers.length > 0;

    return new Response(
      JSON.stringify({
        serviceable,
        couriers,
        message: (data as { message?: string }).message || (serviceable ? "Serviceable" : "Not serviceable"),
      }),
      { status: 200, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Nimbuspost] Serviceability error:", error);
    return new Response(
      JSON.stringify({
        serviceable: false,
        couriers: [],
        message: "Unable to check serviceability",
      }),
      { status: 500, headers: { ...corsHeadersLocal, "Content-Type": "application/json" } }
    );
  }
});
