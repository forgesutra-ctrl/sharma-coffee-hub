/**
 * DTDC shipping-label Edge Function.
 *
 * POST `{ referenceNumber, labelCode?, labelFormat? }` to this endpoint and
 * it will:
 *   1. Validate the input (referenceNumber required, labelCode/labelFormat
 *      checked against allowed values).
 *   2. GET DTDC's shipping-label endpoint with the api-key header.
 *   3. Return either:
 *        - the raw PDF bytes (with download headers) when labelFormat="pdf", or
 *        - a JSON envelope { success, format, referenceNumber, base64, raw }
 *          when labelFormat="base64".
 *
 * Credentials live in Supabase secrets (DTDC_API_KEY, optional
 * DTDC_API_BASE_URL). The frontend never sees the api-key — it only POSTs
 * the referenceNumber to this Edge Function.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders,
  getDtdcEnv,
  jsonResponse,
  jsonError,
  verifyAdminAuth,
  DTDC_ENDPOINTS,
  type DtdcLabelInput,
  type DtdcLabelResult,
  type DtdcLabelCode,
} from "../_shared/dtdc-utils.ts";

// === Local validation constants ==============================================

// Runtime mirror of the DtdcLabelCode union from dtdc-utils.ts.
// Kept here (not in dtdc-utils.ts) per the agreed split between types and
// per-function validation lists.
const VALID_LABEL_CODES = [
  "SHIP_LABEL_A4",
  "SHIP_LABEL_A6",
  "SHIP_LABEL_POD",
  "SHIP_LABEL_4X6",
  "ROUTE_LABEL_A4",
  "ROUTE_LABEL_4X4",
  "INVOICE",
  "ADDR_LABEL_A4",
  "ADDR_LABEL_4X2",
] as const satisfies readonly DtdcLabelCode[];

const VALID_LABEL_FORMATS = ["pdf", "base64"] as const;

const DEFAULT_LABEL_CODE: DtdcLabelCode = "SHIP_LABEL_4X6";
const DEFAULT_LABEL_FORMAT: typeof VALID_LABEL_FORMATS[number] = "pdf";

// === Helpers =================================================================

interface NormalizedInput {
  referenceNumber: string;
  labelCode: DtdcLabelCode;
  labelFormat: typeof VALID_LABEL_FORMATS[number];
}

function validateInput(body: DtdcLabelInput | null): { error: string } | { input: NormalizedInput } {
  if (!body || typeof body !== "object") {
    return { error: "Missing or invalid JSON body" };
  }

  const ref = typeof body.referenceNumber === "string" ? body.referenceNumber.trim() : "";
  if (!ref) {
    return { error: "Missing referenceNumber" };
  }

  const code = body.labelCode ?? DEFAULT_LABEL_CODE;
  if (!VALID_LABEL_CODES.includes(code as DtdcLabelCode)) {
    return {
      error: `Invalid labelCode "${String(code)}". Valid codes: ${VALID_LABEL_CODES.join(", ")}.`,
    };
  }

  const format = body.labelFormat ?? DEFAULT_LABEL_FORMAT;
  if (format !== "pdf" && format !== "base64") {
    return {
      error: `Invalid labelFormat "${String(format)}". Valid formats: ${VALID_LABEL_FORMATS.join(", ")}.`,
    };
  }

  return {
    input: {
      referenceNumber: ref,
      labelCode: code as DtdcLabelCode,
      labelFormat: format,
    },
  };
}

/**
 * Convert a non-OK response body (which may be JSON, HTML, or plain text)
 * into something safe to put in `raw`. Never returns binary bytes.
 */
async function summarizeErrorBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return { snippet: "" };
  try {
    return JSON.parse(text);
  } catch {
    return { snippet: text.slice(0, 300) };
  }
}

/** Pull a human-readable error message from a parsed-JSON or snippet object. */
function extractApiErrorMessage(node: unknown, fallback: string): string {
  if (!node || typeof node !== "object") return fallback;
  const o = node as Record<string, unknown>;
  for (const key of ["message", "error", "error_message", "errorMessage", "reason"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  if (Array.isArray(o.errors) && o.errors.length > 0) {
    const first = o.errors[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object") {
      return extractApiErrorMessage(first, fallback);
    }
  }
  if (typeof o.snippet === "string" && o.snippet.trim()) {
    return o.snippet.trim().slice(0, 200);
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

    /**
     * Auth gate: only admin/staff users (via browser JWT) OR backend internal
     * callers (via DTDC_LEGACY_SERVICE_ROLE_JWT) can generate DTDC shipping labels.
     * Customers and anonymous callers are rejected — labels contain internal
     * AWB references and shipment details that shouldn't be accessible externally.
     */
    const authResult = await verifyAdminAuth(req);
    if (!authResult.ok) {
      return jsonError(authResult.error, authResult.status);
    }

    let body: DtdcLabelInput | null = null;
    try {
      const text = await req.text();
      if (!text.trim()) {
        return jsonError(
          "Request body is empty. Send { referenceNumber, labelCode?, labelFormat? }.",
          400,
        );
      }
      body = JSON.parse(text) as DtdcLabelInput;
    } catch (parseErr) {
      console.error("[DTDC] Invalid JSON body:", parseErr);
      return jsonError("Invalid JSON body", 400);
    }

    const validation = validateInput(body);
    if ("error" in validation) {
      return jsonError(validation.error, 400);
    }
    const { referenceNumber, labelCode, labelFormat } = validation.input;

    const env = getDtdcEnv(["apiKey"]);

    const params = new URLSearchParams({
      reference_number: referenceNumber,
      label_code: labelCode,
      label_format: labelFormat,
    });
    const url = `${env.apiBaseUrl}${DTDC_ENDPOINTS.label}?${params.toString()}`;

    console.log(
      "[DTDC] Fetching label — ref:",
      referenceNumber,
      "code:",
      labelCode,
      "format:",
      labelFormat,
    );
    console.log("[DTDC] GET", url);

    const res = await fetch(url, {
      method: "GET",
      headers: { "api-key": env.apiKey },
    });

    if (!res.ok) {
      const raw = await summarizeErrorBody(res);
      const message = extractApiErrorMessage(
        raw,
        `DTDC label fetch failed (HTTP ${res.status})`,
      );
      console.error("[DTDC] Label fetch HTTP error:", res.status, message);
      return jsonError(message, res.status, {
        raw,
        requestedFormat: labelFormat,
        referenceNumber,
      });
    }

    if (labelFormat === "pdf") {
      const contentType = res.headers.get("content-type") || "";

      // Defensive: DTDC sometimes returns 200 OK with a JSON error envelope
      // even when the caller asked for PDF. Catch that before trying to
      // treat the body as binary.
      if (contentType.toLowerCase().includes("json")) {
        const raw = await res.json().catch(() => null);
        const message = extractApiErrorMessage(
          raw,
          "DTDC returned JSON instead of PDF — likely an error response",
        );
        console.error("[DTDC] Label fetch returned JSON in PDF mode:", message);
        return jsonError(message, 502, {
          raw,
          requestedFormat: labelFormat,
          referenceNumber,
        });
      }

      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);

      console.log(
        "[DTDC] Label received — content-type:",
        contentType || "(none)",
        "bytes:",
        bytes.byteLength,
      );

      if (bytes.byteLength === 0) {
        console.error("[DTDC] Empty PDF body");
        return jsonError("DTDC returned empty label data", 502, {
          raw: { snippet: "" },
          requestedFormat: labelFormat,
          referenceNumber,
        });
      }

      return new Response(bytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="dtdc-label-${referenceNumber}.pdf"`,
        },
      });
    }

    // labelFormat === "base64"
    const json = await res.json().catch(() => null);
    const labelB64 =
      json && typeof json === "object" && typeof (json as { label?: unknown }).label === "string"
        ? (json as { label: string }).label
        : "";

    if (!labelB64) {
      console.error("[DTDC] Base64 response missing label field:", json);
      return jsonError("DTDC base64 response missing label data", 502, {
        raw: json,
        requestedFormat: labelFormat,
        referenceNumber,
      });
    }

    const echoedRef =
      json && typeof json === "object" && typeof (json as { referenceNumber?: unknown }).referenceNumber === "string"
        ? (json as { referenceNumber: string }).referenceNumber
        : referenceNumber;

    console.log("[DTDC] Label received — base64 chars:", labelB64.length);

    const labelResult: DtdcLabelResult = {
      format: "base64",
      base64: labelB64,
      referenceNumber: echoedRef,
      raw: json,
    };
    return jsonResponse({ success: true, ...labelResult }, 200);
  } catch (err) {
    console.error("[DTDC] Shipping label error:", err);
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
