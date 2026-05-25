// Shared DTDC utility functions for Edge Functions.
// DTDC has TWO separate API stacks:
//   1. Shipsy (Order Upload, Shipping Label, Cancellation) — auth via static "api-key" header.
//   2. Tracking — auth via username/password → access token, sent as "X-Access-Token" header.
// All credentials live in Supabase Edge Function secrets and NEVER touch the browser.

import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Default base URLs.
 * If DTDC_API_BASE_URL or DTDC_TRACKING_BASE_URL are not set, we fall back to
 * STAGING. This makes accidental production calls during dev impossible —
 * you must set the env vars explicitly to switch to live URLs.
 */
export const DTDC_DEFAULT_API_BASE_URL = "https://alphademodashboardapi.shipsy.io";
export const DTDC_DEFAULT_TRACKING_BASE_URL = "http://dtdcstagingapi.dtdc.com/dtdc-tracking-api";

/** Endpoint paths (appended to the appropriate base URL). */
export const DTDC_ENDPOINTS = {
  /** POST — create one or more consignments. Stack A (Shipsy api-key). */
  shipment: "/api/customer/integration/consignment/softdata",
  /** GET — download shipping label as PDF or base64 string. Stack A. */
  label: "/api/customer/integration/consignment/shippinglabel/stream",
  /** POST — cancel one or more AWBs. Stack A. */
  cancel: "/api/customer/integration/consignment/cancel",
  /** GET — exchange username+password for a tracking access token. Stack B. */
  trackingAuth: "/dtdc-api/api/dtdc/authenticate",
  /** POST — JSON tracking by AWB or reference number. Stack B. */
  tracking: "/dtdc-api/rest/JSONCnTrk/getTrackDetails",
} as const;

// Tracking access token cache — re-used across requests for ~50 minutes.
// Matches the pattern used by Prozo in src/services/prozo.ts.
const TRACKING_TOKEN_TTL_MS = 50 * 60 * 1000;
let trackingTokenCache: { token: string; cachedAt: number } | null = null;

// === Env helpers =============================================================

// Read & sanitize an env var. Strips whitespace and removes anything after the
// first newline so Windows-style line endings pasted into Supabase secrets
// don't break the value.
function readEnv(name: string): string {
  return (Deno.env.get(name) || "").trim().split(/\r?\n/)[0].trim();
}

const ENV_NAME_BY_KEY = {
  apiKey: "DTDC_API_KEY",
  customerCode: "DTDC_CUSTOMER_CODE",
  apiBaseUrl: "DTDC_API_BASE_URL",
  trackingBaseUrl: "DTDC_TRACKING_BASE_URL",
  trackingUsername: "DTDC_TRACKING_USERNAME",
  trackingPassword: "DTDC_TRACKING_PASSWORD",
  staticAccessToken: "DTDC_ACCESS_TOKEN",
} as const;

export type DtdcEnvKey = keyof typeof ENV_NAME_BY_KEY;

export interface DtdcEnv {
  apiKey: string;
  customerCode: string;
  apiBaseUrl: string;
  trackingBaseUrl: string;
  trackingUsername: string;
  trackingPassword: string;
  /** Optional pre-shared tracking token. If set, skip the authenticate call. */
  staticAccessToken: string;
}

/**
 * Read DTDC env vars and return a typed config object.
 *
 * Pass `required` to declare which keys MUST be present for the calling
 * function; an Error is thrown listing every missing one. URL keys
 * (`apiBaseUrl`, `trackingBaseUrl`) always resolve because we fall back to
 * staging defaults — only list them in `required` if you want to force them
 * to be set explicitly.
 *
 * Example: `getDtdcEnv(["apiKey", "customerCode"])` for the shipment function.
 */
export function getDtdcEnv(required: DtdcEnvKey[] = []): DtdcEnv {
  const env: DtdcEnv = {
    apiKey: readEnv("DTDC_API_KEY"),
    customerCode: readEnv("DTDC_CUSTOMER_CODE"),
    apiBaseUrl: (readEnv("DTDC_API_BASE_URL") || DTDC_DEFAULT_API_BASE_URL).replace(/\/+$/, ""),
    trackingBaseUrl: (readEnv("DTDC_TRACKING_BASE_URL") || DTDC_DEFAULT_TRACKING_BASE_URL).replace(/\/+$/, ""),
    trackingUsername: readEnv("DTDC_TRACKING_USERNAME"),
    trackingPassword: readEnv("DTDC_TRACKING_PASSWORD"),
    staticAccessToken: readEnv("DTDC_ACCESS_TOKEN"),
  };

  const missing: string[] = [];
  for (const key of required) {
    if (!env[key]) missing.push(ENV_NAME_BY_KEY[key]);
  }
  if (missing.length > 0) {
    throw new Error(
      `DTDC is not configured. Set ${missing.join(", ")} in Supabase Dashboard → Project Settings → Edge Functions → Secrets.`,
    );
  }

  return env;
}

// === JSON response helpers ===================================================

/** Build a standard JSON Response with CORS headers attached. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Build a `{ success: false, error, ... }` JSON error response with CORS headers. */
export function jsonError(message: string, status = 500, extra?: Record<string, unknown>): Response {
  return jsonResponse({ success: false, error: message, ...(extra ?? {}) }, status);
}

// === Tracking token ==========================================================

/** Force-clear the cached tracking token (call after a 401 to retry auth). */
export function clearDtdcTrackingTokenCache(): void {
  trackingTokenCache = null;
}

/**
 * Returns a valid DTDC tracking access token.
 *
 * - If `DTDC_ACCESS_TOKEN` is set, that pre-shared token is returned directly
 *   (the authenticate endpoint is skipped entirely).
 * - Otherwise, calls the authenticate endpoint with `DTDC_TRACKING_USERNAME`
 *   and `DTDC_TRACKING_PASSWORD` and caches the result for ~50 minutes.
 * - Pass `{ force: true }` to bypass the cache and re-authenticate
 *   (e.g. when the previous request got 401).
 */
export async function getDtdcTrackingToken(opts?: { force?: boolean }): Promise<string> {
  const force = opts?.force ?? false;

  const env = getDtdcEnv();

  if (env.staticAccessToken) {
    return env.staticAccessToken;
  }

  if (!force && trackingTokenCache && Date.now() - trackingTokenCache.cachedAt < TRACKING_TOKEN_TTL_MS) {
    return trackingTokenCache.token;
  }

  if (!env.trackingUsername || !env.trackingPassword) {
    throw new Error(
      "DTDC tracking is not configured. Set either DTDC_ACCESS_TOKEN, or both DTDC_TRACKING_USERNAME and DTDC_TRACKING_PASSWORD, in Supabase Dashboard → Project Settings → Edge Functions → Secrets.",
    );
  }

  const url =
    `${env.trackingBaseUrl}${DTDC_ENDPOINTS.trackingAuth}` +
    `?username=${encodeURIComponent(env.trackingUsername)}` +
    `&password=${encodeURIComponent(env.trackingPassword)}`;

  const res = await fetch(url, { method: "GET" });
  // The PDF doesn't specify text vs JSON; handle both defensively.
  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`DTDC tracking authenticate failed (${res.status}): ${raw.slice(0, 300)}`);
  }

  const token = extractTrackingToken(raw);
  if (!token) {
    console.warn("[DTDC] Could not extract tracking token from response. Body:", raw.slice(0, 300));
    throw new Error("DTDC tracking authenticate response did not contain a usable token.");
  }

  trackingTokenCache = { token, cachedAt: Date.now() };
  return token;
}

// Pull the access token out of either a JSON object or a raw string body.
function extractTrackingToken(rawBody: string): string | null {
  const trimmed = rawBody.trim();
  if (!trimmed) return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
    if (parsed && typeof parsed === "object") {
      return findTokenInObject(parsed as Record<string, unknown>);
    }
  } catch {
    // Not JSON — fall through to plain text handling.
  }

  // Reject obvious HTML/error pages.
  if (trimmed.startsWith("<")) return null;
  // Some implementations wrap the bare token in quotes.
  return trimmed.replace(/^"+|"+$/g, "").trim() || null;
}

function findTokenInObject(obj: Record<string, unknown>): string | null {
  const candidateKeys = ["accessToken", "access_token", "token", "apikey", "apiKey", "key"];
  for (const k of candidateKeys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const nested = obj.data ?? obj.result ?? obj.response;
  if (nested && typeof nested === "object") {
    return findTokenInObject(nested as Record<string, unknown>);
  }
  return null;
}

// === Status mapping ==========================================================

export type DtdcMappedStatus =
  | "confirmed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "rto";

/**
 * Map a DTDC `strStatus` / `strAction` value to a normalized status used by
 * our orders table. Returns `"shipped"` as a sensible default for unknown
 * in-transit values (e.g. HELDUP, ATTEMPTED, DELIVERY PROCESS IN PROGRESS).
 */
export function mapDtdcStatus(value: string | null | undefined): DtdcMappedStatus {
  const v = String(value ?? "").trim().toUpperCase();
  if (!v) return "confirmed";
  if (v.includes("DELIVERED")) return "delivered";
  if (v.includes("OUT FOR DELIVERY")) return "out_for_delivery";
  if (v.includes("RTO") || v.includes("RETURN")) return "rto";
  if (v.includes("CANCEL")) return "cancelled";
  if (v.includes("BOOKED")) return "confirmed";
  return "shipped";
}

// === Types: Shipment (Order Upload) ==========================================

/** Sender / receiver address used by the shipment endpoint. */
export interface DtdcAddress {
  name: string;
  phone: string;
  alternatePhone?: string;
  addressLine1: string;
  addressLine2?: string;
  pincode: string;
  city: string;
  state: string;
}

/**
 * Return-to address. NOTE: DTDC's API uses `city_name` / `state_name` here
 * (different from origin / destination which use `city` / `state`). The
 * shipment function will translate this interface to the wire format.
 */
export interface DtdcReturnAddress {
  name: string;
  phone: string;
  alternatePhone?: string;
  addressLine1: string;
  addressLine2?: string;
  pincode: string;
  city: string;
  state: string;
  email?: string;
}

/** Single piece detail for Multi-Parcel Shipments (MPS). */
export interface DtdcPieceDetail {
  description: string;
  declaredValue: number | string;
  weight: number | string;
  height: number | string;
  length: number | string;
  width: number | string;
}

/**
 * Input for creating a DTDC consignment. Most numeric fields will be
 * stringified by the shipment function before sending to DTDC (their API
 * expects strings for numbers).
 */
export interface DtdcCreateShipmentInput {
  /** Our internal order id; sent as `customer_reference_number` for tracking. */
  customerReferenceNumber: string;
  /** Service type id (e.g. "B2C PRIORITY"). Default applied by the shipment function. */
  serviceTypeId?: string;
  /** "NON-DOCUMENT" for parcels (default). */
  loadType?: string;
  description?: string;
  dimensions: { length: number; width: number; height: number; unit?: "cm" };
  weight: { value: number; unit?: "kg" };
  declaredValue: number;
  numPieces?: number;
  origin: DtdcAddress;
  destination: DtdcAddress;
  returnAddress?: DtdcReturnAddress;
  /** Mandatory only for COD orders. */
  cod?: { mode: "CASH"; amount: number };
  /** DTDC commodity id; default "99" (general merchandise). */
  commodityId?: string;
  ewayBill?: string;
  isRiskSurchargeApplicable?: boolean;
  invoiceNumber?: string;
  /** Format DTDC expects: "14 Oct 2022". */
  invoiceDate?: string;
  /** Optional reference number (you may pass an AWB here). */
  referenceNumber?: string;
  /** For MPS only — required when `numPieces > 1`. */
  pieces?: DtdcPieceDetail[];
}

/** Result returned by the shipment function once we add it. */
export interface DtdcCreateShipmentResult {
  success: boolean;
  /** The DTDC AWB (response field `reference_number`). */
  awb: string | null;
  /** Echo of our `customer_reference_number`. */
  customerReferenceNumber: string | null;
  /** Raw DTDC response body for debugging. */
  raw: unknown;
  /** Human-readable error if `success` is false. */
  errorMessage?: string;
}

// === Types: Tracking =========================================================

/** Input for the tracking function. */
export interface DtdcTrackingInput {
  /** Consignment number (AWB) or reference number. */
  cnNumber: string;
  /** "cnno" (default) for AWB lookup, "reference" for reference-number lookup. */
  trkType?: "cnno" | "reference";
  /** Whether to include the per-event details list. Defaults to true. */
  additionalDetails?: boolean;
}

/** A single tracking event from `trackDetails`. */
export interface DtdcTrackingEvent {
  code: string;
  action: string;
  manifestNo: string;
  origin: string;
  destination: string;
  /** Format from API: "DDMMYYYY" — the tracking function may reformat it. */
  date: string;
  /** Format from API: "HHMM". */
  time: string;
  remarks: string;
  /** Per-event normalized status, derived from `action` via `mapDtdcStatus`. */
  mappedStatus?: DtdcMappedStatus;
}

/** Result returned by the tracking function once we add it. */
export interface DtdcTrackingResult {
  success: boolean;
  /** DTDC `statusCode` (200 = OK, 206 = partial, 401 = auth, etc.). */
  statusCode: number | null;
  shipmentNumber: string | null;
  refNumber: string | null;
  /** The high-level status string ("Delivered", "In Transit", etc.). */
  currentStatus: string | null;
  origin: string | null;
  destination: string | null;
  bookedDate: string | null;
  weight: string | null;
  weightUnit: string | null;
  /** Time-ordered tracking events. */
  events: DtdcTrackingEvent[];
  /** Normalized status for our orders table. */
  mappedStatus?: DtdcMappedStatus;
  /** Raw DTDC response body for debugging. */
  raw: unknown;
  errorMessage?: string;
}

// === Types: Shipping Label ===================================================

/** Supported label codes per DTDC docs. */
export type DtdcLabelCode =
  | "SHIP_LABEL_A4"
  | "SHIP_LABEL_A6"
  | "SHIP_LABEL_POD"
  | "SHIP_LABEL_4X6"
  | "ROUTE_LABEL_A4"
  | "ROUTE_LABEL_4X4"
  | "INVOICE"
  | "ADDR_LABEL_A4"
  | "ADDR_LABEL_4X2";

/** Input for the label function. */
export interface DtdcLabelInput {
  /** AWB / reference number of the consignment. */
  referenceNumber: string;
  /** Defaults to SHIP_LABEL_4X6 (standard thermal printer label). */
  labelCode?: DtdcLabelCode;
  /** Defaults to "pdf". */
  labelFormat?: "pdf" | "base64";
}

/** Result returned by the label function once we add it. */
export interface DtdcLabelResult {
  format: "pdf" | "base64";
  /** Raw PDF bytes (only when `format === "pdf"`). */
  pdfBytes?: Uint8Array;
  /** Base64-encoded PDF (only when `format === "base64"`). */
  base64?: string;
  /** Echoed by DTDC in the base64 response. */
  referenceNumber?: string;
  raw?: unknown;
}

// === Types: Cancellation =====================================================

/** Input for the cancel function. */
export interface DtdcCancelInput {
  /** One or more AWB numbers to cancel. */
  awbNumbers: string[];
  /** Override `DTDC_CUSTOMER_CODE` for this single call (rarely needed). */
  customerCode?: string;
}

/** Result returned by the cancel function once we add it. */
export interface DtdcCancelResult {
  /** True if all AWBs cancelled successfully. */
  success: boolean;
  /** AWBs that were successfully cancelled. */
  successAwbs: string[];
  /** AWBs that failed, with the reason if DTDC provided one. */
  failedAwbs: { awb: string; reason?: string }[];
  /** Raw DTDC response body for debugging. */
  raw: unknown;
  errorMessage?: string;
}

// === Auth helpers ============================================================

/**
 * Roles allowed to invoke the admin-only DTDC functions
 * (create-shipment, shipping-label, cancel).
 *
 * Mirrors the role set used by `src/components/auth/ProtectedRoute.tsx` and
 * `src/context/AuthContext.tsx` so a user who passes the frontend admin gate
 * will also pass the Edge Function gate.
 */
const DTDC_ADMIN_ROLES = ["super_admin", "admin", "staff", "shop_staff"] as const;
type DtdcAdminRole = typeof DTDC_ADMIN_ROLES[number];

/**
 * Verify that the caller is an admin (super_admin / admin / staff / shop_staff).
 *
 * Used by the admin-only DTDC functions: dtdc-create-shipment,
 * dtdc-shipping-label, dtdc-cancel.
 *
 * Auth bypass order:
 *   1. DTDC_INTERNAL_SECRET (custom shared secret — currently blocked by
 *      Supabase Edge Function gateway, kept for future)
 *   2. DTDC_LEGACY_SERVICE_ROLE_JWT (the project's legacy service_role JWT —
 *      used by webhooks; passes gateway because JWT format)
 *   3. SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase runtime —
 *      currently the new sb_secret_* opaque key, blocked by gateway)
 *   4. Valid user JWT with admin role (via browser session)
 *
 * All bypass secrets are byte-for-byte compared against the bearer token;
 * no JWT payload is trusted without signature verification. All are
 * Supabase server-side secrets never exposed to the browser, so the bypasses
 * are safe.
 *
 * NOTE: The DTDC_LEGACY_SERVICE_ROLE_JWT bypass is tied to Supabase's legacy
 * key system. If Supabase deprecates legacy keys, webhooks will need to be
 * migrated to a different auth scheme (e.g., custom header outside
 * Authorization).
 *
 * Returns a typed discriminated union — callers should branch on `result.ok`
 * and use `jsonError(result.error, result.status)` on failure.
 */
export async function verifyAdminAuth(
  req: Request,
): Promise<
  | { ok: true; user: { id: string; email?: string } }
  | { ok: false; status: number; error: string }
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, status: 401, error: "Missing authorization header" };
  }

  // Parse & trim the bearer token once, up front. Both the service-role
  // equality check and the JWT validation path below use this same
  // normalised value, so any stray whitespace on the client side gets
  // stripped here (matching readEnv() which strips it on the env-var side).
  // The /i flag accepts "Bearer", "bearer", "BEARER", etc.
  const token = (authHeader.match(/^Bearer\s+(.+)$/i)?.[1] ?? "").trim();
  if (!token) {
    return { ok: false, status: 401, error: "Invalid token format" };
  }

  // Bypass secrets — all three are Supabase server-side secrets, never
  // exposed to the browser. Read them all up-front so the debug log below
  // can report on each. See the JSDoc above for why we keep three: gateway
  // rewrite/reject behaviour differs by bearer value type, and one of the
  // three is currently the actual working path for webhooks.
  const internalSecret = readEnv("DTDC_INTERNAL_SECRET");

  // DTDC_LEGACY_SERVICE_ROLE_JWT is the project's legacy (JWT-format)
  // service_role key. Webhooks send this because the Supabase Edge Function
  // gateway accepts JWT-formatted bearers but rejects opaque ones (which
  // includes the new sb_secret_* keys and our custom DTDC_INTERNAL_SECRET).
  const legacyServiceRoleJwt = readEnv("DTDC_LEGACY_SERVICE_ROLE_JWT");

  // readEnv (defined at top of this file) trims whitespace and strips
  // trailing newlines. Pasting long JWTs into the Supabase secrets UI
  // routinely appends a trailing newline; raw Deno.env.get would cause
  // the byte-for-byte equality check below to silently fail.
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  // Optional diagnostic — lengths only, never the actual key bytes.
  // Set DTDC_AUTH_DEBUG=true in Supabase secrets to enable temporarily.
  if (Deno.env.get("DTDC_AUTH_DEBUG") === "true") {
    console.log(
      "[DTDC auth]",
      "token len:", token.length,
      "internal secret len:", internalSecret.length,
      "internal match:", token === internalSecret,
      "legacy jwt len:", legacyServiceRoleJwt.length,
      "legacy match:", token === legacyServiceRoleJwt,
      "service key len:", serviceRoleKey.length,
      "service match:", token === serviceRoleKey,
    );
  }

  // Bypass #1 — internal shared secret. Currently blocked by the Supabase
  // Edge Function gateway (it rejects non-JWT bearers); kept here as dead
  // code for the day the gateway is fixed or bypassed.
  if (internalSecret && token === internalSecret) {
    return { ok: true, user: { id: "internal-secret", email: undefined } };
  }

  // Bypass #2 — legacy service_role JWT. This is the actual path used by
  // webhooks in production today: it passes the Supabase gateway because
  // the value is JWT-formatted, and we trust it inside the function via
  // byte-for-byte equality (no JWT payload decoding).
  if (legacyServiceRoleJwt && token === legacyServiceRoleJwt) {
    return { ok: true, user: { id: "legacy-service-role", email: undefined } };
  }

  // Bypass #3 — direct match against SUPABASE_SERVICE_ROLE_KEY. On projects
  // that have rolled over to the new sb_secret_* opaque keys this is also
  // blocked by the gateway; kept here for backward compat and in case the
  // env var ever returns a JWT-format value again.
  if (serviceRoleKey && token === serviceRoleKey) {
    return { ok: true, user: { id: "service-role", email: undefined } };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      status: 500,
      error: "Supabase environment not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).",
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: "Invalid token" };
  }
  const user = userData.user;

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (roleRow?.role ?? "") as string;
  if (!DTDC_ADMIN_ROLES.includes(role as DtdcAdminRole)) {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return { ok: true, user: { id: user.id, email: user.email ?? undefined } };
}

/**
 * Verify that the caller is any authenticated user — used by dtdc-track.
 *
 * Customers placing orders should be able to track their own shipments, so
 * this helper does NOT reject non-admin users. Instead it returns an
 * `isAdmin` flag alongside the user info; the tracking function can then
 * decide whether to allow tracking arbitrary AWBs (admins) or only AWBs
 * belonging to the user's own orders (customers).
 *
 * Auth bypass order:
 *   1. DTDC_INTERNAL_SECRET (custom shared secret — currently blocked by
 *      Supabase Edge Function gateway, kept for future)
 *   2. DTDC_LEGACY_SERVICE_ROLE_JWT (the project's legacy service_role JWT —
 *      used by webhooks; passes gateway because JWT format)
 *   3. SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase runtime —
 *      currently the new sb_secret_* opaque key, blocked by gateway)
 *   4. Valid user JWT (admin or customer; `isAdmin` flag indicates role)
 *
 * All bypass secrets are byte-for-byte compared against the bearer token
 * and treated as `isAdmin: true`, so internal webhooks / cron jobs can
 * invoke dtdc-track without restriction. No JWT payload is trusted without
 * signature verification.
 *
 * NOTE: The DTDC_LEGACY_SERVICE_ROLE_JWT bypass is tied to Supabase's legacy
 * key system. If Supabase deprecates legacy keys, webhooks will need to be
 * migrated to a different auth scheme (e.g., custom header outside
 * Authorization).
 */
export async function verifyUserAuth(
  req: Request,
): Promise<
  | { ok: true; user: { id: string; email?: string }; isAdmin: boolean }
  | { ok: false; status: number; error: string }
> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, status: 401, error: "Missing authorization header" };
  }

  // Parse & trim the bearer token once, up front — see verifyAdminAuth for
  // the full rationale. Both this helper and verifyAdminAuth must use the
  // same parsing logic so they behave consistently across DTDC functions.
  const token = (authHeader.match(/^Bearer\s+(.+)$/i)?.[1] ?? "").trim();
  if (!token) {
    return { ok: false, status: 401, error: "Invalid token format" };
  }

  // Bypass secrets — see verifyAdminAuth for the full rationale on the
  // three-secret arrangement and which one actually works in production
  // today (DTDC_LEGACY_SERVICE_ROLE_JWT).
  const internalSecret = readEnv("DTDC_INTERNAL_SECRET");
  const legacyServiceRoleJwt = readEnv("DTDC_LEGACY_SERVICE_ROLE_JWT");

  // Sanitised env read — see verifyAdminAuth for why we don't use raw
  // Deno.env.get here.
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (Deno.env.get("DTDC_AUTH_DEBUG") === "true") {
    console.log(
      "[DTDC auth]",
      "token len:", token.length,
      "internal secret len:", internalSecret.length,
      "internal match:", token === internalSecret,
      "legacy jwt len:", legacyServiceRoleJwt.length,
      "legacy match:", token === legacyServiceRoleJwt,
      "service key len:", serviceRoleKey.length,
      "service match:", token === serviceRoleKey,
    );
  }

  // Bypass #1 — internal shared secret. Currently blocked by Supabase
  // Edge Function gateway; kept as dead code for future use.
  if (internalSecret && token === internalSecret) {
    return { ok: true, user: { id: "internal-secret", email: undefined }, isAdmin: true };
  }

  // Bypass #2 — legacy service_role JWT. The actual path used by webhooks
  // in production today; passes the gateway because the value is JWT-formatted.
  if (legacyServiceRoleJwt && token === legacyServiceRoleJwt) {
    return { ok: true, user: { id: "legacy-service-role", email: undefined }, isAdmin: true };
  }

  // Bypass #3 — direct match against SUPABASE_SERVICE_ROLE_KEY. May be
  // blocked by the gateway depending on key format; see verifyAdminAuth.
  if (serviceRoleKey && token === serviceRoleKey) {
    return { ok: true, user: { id: "service-role", email: undefined }, isAdmin: true };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      ok: false,
      status: 500,
      error: "Supabase environment not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).",
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: "Invalid token" };
  }
  const user = userData.user;

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = (roleRow?.role ?? "") as string;
  const isAdmin = DTDC_ADMIN_ROLES.includes(role as DtdcAdminRole);

  return {
    ok: true,
    user: { id: user.id, email: user.email ?? undefined },
    isAdmin,
  };
}
