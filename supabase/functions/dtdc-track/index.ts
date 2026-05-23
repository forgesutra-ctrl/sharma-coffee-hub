/**
 * DTDC track-shipment Edge Function.
 *
 * POST `{ awb: "<consignment_number>" }` to this endpoint and it will:
 *   1. Acquire (or reuse a cached) DTDC tracking access token.
 *   2. POST to DTDC's JSON tracking endpoint with `X-Access-Token`.
 *   3. Translate DTDC's response into a normalized `DtdcTrackingResult`,
 *      with parsed dates, parsed times, and per-event mapped statuses.
 *   4. Auto-retry exactly once on a 401 (forces a fresh token).
 *
 * Credentials and base URL live in Supabase secrets (DTDC_ACCESS_TOKEN, or
 * DTDC_TRACKING_USERNAME + DTDC_TRACKING_PASSWORD; optional DTDC_TRACKING_BASE_URL).
 * The frontend never sees them.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  getDtdcEnv,
  getDtdcTrackingToken,
  clearDtdcTrackingTokenCache,
  jsonResponse,
  jsonError,
  mapDtdcStatus,
  DTDC_ENDPOINTS,
  type DtdcTrackingResult,
  type DtdcTrackingEvent,
} from "../_shared/dtdc-utils.ts";

// === Local input type ========================================================

interface TrackingBody {
  /** Single AWB / consignment number. */
  awb?: string;
  /** Optional batch field — only the first AWB is used (batching deferred). */
  awbNumbers?: string[];
}

// === Helpers =================================================================

function extractAwb(body: TrackingBody | null): string | null {
  if (!body || typeof body !== "object") return null;
  if (typeof body.awb === "string" && body.awb.trim()) return body.awb.trim();
  if (Array.isArray(body.awbNumbers) && body.awbNumbers.length > 0) {
    const first = body.awbNumbers[0];
    if (typeof first === "string" && first.trim()) return first.trim();
  }
  return null;
}

function coerceString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** "DDMMYYYY" → "YYYY-MM-DD". Returns null on empty/invalid input. */
function parseDtdcDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!/^\d{8}$/.test(s)) return null;
  const day = Number(s.slice(0, 2));
  const month = Number(s.slice(2, 4));
  const year = Number(s.slice(4, 8));
  if (day < 1 || day > 31) return null;
  if (month < 1 || month > 12) return null;
  if (year < 1970 || year > 2100) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

/**
 * "HHMM" → "HH:MM". Strings that already contain ":" (e.g. "15:30:25") are
 * passed through unchanged. Returns null on empty/invalid input.
 */
function parseDtdcTime(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.includes(":")) return s;
  if (!/^\d{4}$/.test(s)) return null;
  const hh = Number(s.slice(0, 2));
  const mm = Number(s.slice(2, 4));
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
}

/** Pull the human-readable error from DTDC's `errorDetails` array, with fallbacks. */
function extractTrackingErrorMessage(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "Consignment not found";
  const o = raw as Record<string, unknown>;
  const details = o.errorDetails;
  if (Array.isArray(details)) {
    for (const entry of details) {
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        if (e.name === "strError" && typeof e.value === "string" && e.value.trim()) {
          return e.value.trim();
        }
      }
    }
    if (details.length > 0) {
      const first = details[0];
      if (first && typeof first === "object") {
        const v = (first as Record<string, unknown>).value;
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
  }
  if (typeof o.status === "string" && o.status.trim() && o.status !== "SUCCESS") {
    return `DTDC tracking returned status: ${o.status}`;
  }
  return "Consignment not found";
}

/** Translate a DTDC tracking response into our normalized shape. */
function buildTrackingResult(raw: unknown): DtdcTrackingResult {
  if (!raw || typeof raw !== "object") {
    return {
      success: false,
      statusCode: null,
      shipmentNumber: null,
      refNumber: null,
      currentStatus: null,
      origin: null,
      destination: null,
      bookedDate: null,
      weight: null,
      weightUnit: null,
      events: [],
      raw,
      errorMessage: "DTDC returned a non-JSON response",
    };
  }

  const r = raw as Record<string, unknown>;
  const header = (r.trackHeader as Record<string, unknown> | undefined) ?? undefined;
  const detailsRaw = Array.isArray(r.trackDetails) ? r.trackDetails : [];

  const events: DtdcTrackingEvent[] = detailsRaw.map((entry) => {
    const e = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const action = coerceString(e.strAction);
    return {
      code: coerceString(e.strCode),
      action,
      manifestNo: coerceString(e.strManifestNo),
      origin: coerceString(e.strOrigin),
      destination: coerceString(e.strDestination),
      date: parseDtdcDate(e.strActionDate) ?? "",
      time: parseDtdcTime(e.strActionTime) ?? "",
      remarks: coerceString(e.sTrRemarks),
      mappedStatus: mapDtdcStatus(action),
    };
  });

  // Sort newest-first using "YYYY-MM-DD HH:MM" string comparison (descending).
  // Empty dates sort to the end naturally because "" is lexicographically less than any date.
  events.sort((a, b) => {
    const ka = `${a.date} ${a.time}`;
    const kb = `${b.date} ${b.time}`;
    if (ka === kb) return 0;
    return ka < kb ? 1 : -1;
  });

  const currentStatus = header ? coerceString(header.strStatus) || null : null;
  const statusCodeNum = typeof r.statusCode === "number" ? r.statusCode : null;

  return {
    success: true,
    statusCode: statusCodeNum,
    shipmentNumber: header ? coerceString(header.strShipmentNo) || null : null,
    refNumber: header ? coerceString(header.strRefNo) || null : null,
    currentStatus,
    origin: header ? coerceString(header.strOrigin) || null : null,
    destination: header ? coerceString(header.strDestination) || null : null,
    bookedDate: header ? parseDtdcDate(header.strBookedDate) : null,
    weight: header ? coerceString(header.strWeight) || null : null,
    weightUnit: header ? coerceString(header.strWeightUnit) || null : null,
    events,
    mappedStatus: currentStatus ? mapDtdcStatus(currentStatus) : undefined,
    raw,
  };
}

/** Single fetch to DTDC's tracking endpoint. Used by the handler with retry-on-401 logic. */
async function postDtdcTracking(
  trackingBaseUrl: string,
  token: string,
  awb: string,
): Promise<Response> {
  const url = `${trackingBaseUrl}${DTDC_ENDPOINTS.tracking}`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Access-Token": token,
    },
    body: JSON.stringify({
      trkType: "cnno",
      strcnno: awb,
      addtnlDtl: "Y",
    }),
  });
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

    let body: TrackingBody | null = null;
    try {
      const text = await req.text();
      if (!text.trim()) {
        return jsonError("Request body is empty. Send a JSON body with { awb }.", 400);
      }
      body = JSON.parse(text) as TrackingBody;
    } catch (parseErr) {
      console.error("[DTDC] Invalid JSON body:", parseErr);
      return jsonError("Invalid JSON body", 400);
    }

    const awb = extractAwb(body);
    if (!awb) {
      return jsonError("Missing awb. Send { awb: \"<consignment_number>\" }.", 400);
    }

    const env = getDtdcEnv();
    const url = `${env.trackingBaseUrl}${DTDC_ENDPOINTS.tracking}`;

    console.log("[DTDC] Tracking AWB:", awb);
    console.log("[DTDC] POST", url);

    let token = await getDtdcTrackingToken();
    let res = await postDtdcTracking(env.trackingBaseUrl, token, awb);

    if (res.status === 401) {
      console.warn("[DTDC] Tracking auth failed (401), refreshing token and retrying...");
      clearDtdcTrackingTokenCache();
      token = await getDtdcTrackingToken({ force: true });
      res = await postDtdcTracking(env.trackingBaseUrl, token, awb);
    }

    const raw = await res.json().catch(() => null);

    const trackingStatus =
      raw && typeof raw === "object" && typeof (raw as { status?: unknown }).status === "string"
        ? (raw as { status: string }).status
        : "(unknown)";
    const eventCount =
      raw && typeof raw === "object" && Array.isArray((raw as { trackDetails?: unknown }).trackDetails)
        ? ((raw as { trackDetails: unknown[] }).trackDetails.length)
        : 0;
    console.log(
      "[DTDC] Response status:",
      res.status,
      "trackingStatus:",
      trackingStatus,
      "events:",
      eventCount,
    );

    if (!res.ok) {
      const message =
        raw && typeof raw === "object"
          ? extractTrackingErrorMessage(raw)
          : `DTDC tracking failed (HTTP ${res.status})`;
      console.error("[DTDC] Tracking HTTP error:", res.status, message);
      return jsonError(message, res.status, { raw });
    }

    if (!raw || typeof raw !== "object") {
      console.warn("[DTDC] Tracking response was not JSON");
      return jsonError("DTDC returned a non-JSON tracking response", 502, { raw });
    }

    const r = raw as Record<string, unknown>;
    if (r.statusFlag === false || r.status === "FAILED") {
      const errorMessage = extractTrackingErrorMessage(raw);
      console.warn("[DTDC] DTDC reports failed tracking:", errorMessage);
      return jsonResponse(
        {
          success: false,
          statusCode: typeof r.statusCode === "number" ? r.statusCode : null,
          shipmentNumber: null,
          refNumber: null,
          currentStatus: null,
          origin: null,
          destination: null,
          bookedDate: null,
          weight: null,
          weightUnit: null,
          events: [],
          errorMessage,
          raw,
        } satisfies DtdcTrackingResult,
        200,
      );
    }

    if (!r.trackHeader) {
      console.warn("[DTDC] Tracking response missing trackHeader");
      return jsonResponse(
        {
          success: false,
          statusCode: typeof r.statusCode === "number" ? r.statusCode : null,
          shipmentNumber: null,
          refNumber: null,
          currentStatus: null,
          origin: null,
          destination: null,
          bookedDate: null,
          weight: null,
          weightUnit: null,
          events: [],
          errorMessage: "Consignment not found",
          raw,
        } satisfies DtdcTrackingResult,
        200,
      );
    }

    const result = buildTrackingResult(raw);
    console.log(
      "[DTDC] Tracking translated:",
      result.shipmentNumber,
      "currentStatus:",
      result.currentStatus,
      "mapped:",
      result.mappedStatus,
    );
    return jsonResponse(result, 200);
  } catch (err) {
    console.error("[DTDC] Tracking error:", err);
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
