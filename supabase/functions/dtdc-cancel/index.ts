/**
 * DTDC cancel-shipment Edge Function.
 *
 * POST `{ awb: "<consignment_number>" }` to this endpoint and it will:
 *   1. Validate the AWB.
 *   2. POST `{ AWBNo: [awb], customerCode }` to DTDC's cancel endpoint with
 *      the `api-key` header.
 *   3. Translate DTDC's `successConsignments[0]` into a normalized
 *      `DtdcCancelResult` (success → `successAwbs`, failure → `failedAwbs`
 *      with a reason extracted from DTDC's response).
 *
 * Single AWB per call — matches Prozo's cancel pattern and keeps the API
 * surface simple. Credentials live in Supabase secrets (DTDC_API_KEY,
 * DTDC_CUSTOMER_CODE, optional DTDC_API_BASE_URL).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  getDtdcEnv,
  jsonResponse,
  jsonError,
  DTDC_ENDPOINTS,
  type DtdcCancelResult,
} from "../_shared/dtdc-utils.ts";

// === Local input type ========================================================

// Future: to support batch cancellation, accept `awbNumbers?: string[]`
// alongside the single `awb` field. The DTDC wire format already takes an
// array (`AWBNo: [...]`), so the request side is a one-line change. The
// response shape (`DtdcCancelResult.successAwbs` / `failedAwbs`) is already
// designed to hold multiple results.
interface SingleCancelBody {
  awb: string;
}

// === Helpers =================================================================

function extractAwb(body: SingleCancelBody | null): string | null {
  if (!body || typeof body !== "object") return null;
  if (typeof body.awb === "string" && body.awb.trim()) return body.awb.trim();
  return null;
}

/** Pull a per-consignment failure reason from DTDC's response entry. */
function extractCancelReason(node: unknown, fallback: string): string {
  if (!node || typeof node !== "object") return fallback;
  const o = node as Record<string, unknown>;
  for (const key of ["errorMessage", "message", "error", "reason", "error_message"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return fallback;
}

/** Pull a top-level error message from DTDC's response (used on HTTP errors). */
function extractTopLevelMessage(raw: unknown, fallback: string): string {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  for (const key of ["message", "error", "error_message", "reason"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  if (Array.isArray(o.errors) && o.errors.length > 0) {
    const first = o.errors[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object") {
      return extractTopLevelMessage(first, fallback);
    }
  }
  return fallback;
}

// === Handler =================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonError("Method not allowed. Use POST.", 405);
    }

    let body: SingleCancelBody | null = null;
    try {
      const text = await req.text();
      if (!text.trim()) {
        return jsonError("Request body is empty. Send { awb }.", 400);
      }
      body = JSON.parse(text) as SingleCancelBody;
    } catch (parseErr) {
      console.error("[DTDC] Invalid JSON body:", parseErr);
      return jsonError("Invalid JSON body", 400);
    }

    const awb = extractAwb(body);
    if (!awb) {
      return jsonError("Missing awb. Send { awb: \"<awb_number>\" }.", 400);
    }

    const env = getDtdcEnv(["apiKey", "customerCode"]);
    const url = `${env.apiBaseUrl}${DTDC_ENDPOINTS.cancel}`;

    console.log("[DTDC] Cancelling AWB:", awb);
    console.log("[DTDC] POST", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": env.apiKey,
      },
      body: JSON.stringify({
        AWBNo: [awb],
        customerCode: env.customerCode,
      }),
    });

    const raw = await res.json().catch(() => null);

    const consignmentsArray =
      raw && typeof raw === "object" && Array.isArray((raw as { successConsignments?: unknown }).successConsignments)
        ? ((raw as { successConsignments: unknown[] }).successConsignments)
        : null;
    const topLevelSuccess =
      raw && typeof raw === "object" && typeof (raw as { success?: unknown }).success === "boolean"
        ? (raw as { success: boolean }).success
        : null;

    console.log(
      "[DTDC] Response status:",
      res.status,
      "topLevelSuccess:",
      topLevelSuccess,
      "consignments:",
      consignmentsArray?.length ?? 0,
    );

    if (!res.ok) {
      const message = extractTopLevelMessage(raw, `DTDC cancel failed (HTTP ${res.status})`);
      console.error("[DTDC] Cancel HTTP error:", res.status, message);
      return jsonError(message, res.status, { raw });
    }

    if (!raw || typeof raw !== "object") {
      console.warn("[DTDC] Cancel response was not JSON");
      return jsonError("DTDC returned a non-JSON cancel response", 502, { raw });
    }

    if (!consignmentsArray || consignmentsArray.length === 0) {
      const reason = "DTDC returned success but no consignment result";
      console.warn("[DTDC] Empty successConsignments — treating as failed cancel for", awb);
      return jsonResponse(
        {
          success: false,
          successAwbs: [],
          failedAwbs: [{ awb, reason }],
          errorMessage: reason,
          raw,
        } satisfies DtdcCancelResult,
        200,
      );
    }

    const first = consignmentsArray[0];
    const perConsignmentSuccess =
      first && typeof first === "object" && typeof (first as { success?: unknown }).success === "boolean"
        ? (first as { success: boolean }).success
        : false;

    // Per-consignment success is authoritative. Warn if it disagrees with the
    // top-level flag so we can spot any DTDC inconsistencies during testing.
    if (topLevelSuccess !== null && topLevelSuccess !== perConsignmentSuccess) {
      console.warn(
        "[DTDC] Top-level success disagrees with per-consignment success for",
        awb,
        "topLevel:",
        topLevelSuccess,
        "perConsignment:",
        perConsignmentSuccess,
        "— trusting per-consignment value.",
      );
    }

    if (!perConsignmentSuccess) {
      const reason = extractCancelReason(first, "DTDC rejected the cancellation");
      console.warn("[DTDC] DTDC rejected cancellation for", awb, ":", reason);
      return jsonResponse(
        {
          success: false,
          successAwbs: [],
          failedAwbs: [{ awb, reason }],
          errorMessage: reason,
          raw,
        } satisfies DtdcCancelResult,
        200,
      );
    }

    console.log("[DTDC] Shipment cancelled:", awb);
    return jsonResponse(
      {
        success: true,
        successAwbs: [awb],
        failedAwbs: [],
        raw,
      } satisfies DtdcCancelResult,
      200,
    );
  } catch (err) {
    console.error("[DTDC] Cancel error:", err);
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
