/**
 * DTDC create-shipment Edge Function.
 *
 * POST a Prozo-shaped order body to this endpoint and it will:
 *   1. Validate the input.
 *   2. Translate it into the DTDC "softdata" wire format (single-parcel).
 *   3. POST it to DTDC's Order Upload API with the api-key header.
 *   4. Return a normalized JSON result containing the AWB.
 *
 * --- Idempotency contract ----------------------------------------------------
 *
 * `orderId` is REQUIRED and is the idempotency key. The function is safe to
 * call multiple times for the same orderId — only ONE real DTDC AWB will ever
 * land in `orders.tracking_number`.
 *
 * Flow:
 *   Phase A (pre-flight): SELECT orders[orderId]. If tracking_number is
 *     already set for DTDC, short-circuit with that AWB. If set for another
 *     provider, refuse with 409. If the order is cancelled, refuse with 409.
 *   Phase B (DTDC API call): unchanged — translate body to DTDC softdata,
 *     POST to DTDC, parse response, get the AWB.
 *   Phase C (conditional write-back): UPDATE orders SET tracking_number=awb,
 *     ... WHERE id=orderId AND tracking_number IS NULL. The `IS NULL` clause
 *     makes this atomic per row — only the first concurrent caller wins.
 *   Phase D (race-loss cleanup): if Phase C affected 0 rows, our AWB is an
 *     orphan at DTDC. Fire-and-forget cancel via internal call to dtdc-cancel
 *     (Bearer DTDC_LEGACY_SERVICE_ROLE_JWT) and return the WINNER's AWB to
 *     the caller so UX is consistent.
 *
 * This protects against the Phase-3 scenario where verify-razorpay-payment
 * AND razorpay-webhook both fire dtdc-create-shipment for the same order.
 *
 * --- Required Supabase secrets ----------------------------------------------
 *
 * Credentials live in Supabase secrets (DTDC_API_KEY, DTDC_CUSTOMER_CODE,
 * optional DTDC_API_BASE_URL) and pickup-address details live in Supabase
 * secrets too (STORE_NAME, STORE_PHONE, STORE_EMAIL, STORE_ADDRESS,
 * STORE_CITY, STORE_STATE, STORE_PINCODE). Nothing is read from the browser.
 *
 * Idempotency additionally requires:
 *   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase
 *     Edge Functions runtime; used for the conditional UPDATE).
 *   - DTDC_LEGACY_SERVICE_ROLE_JWT (used as Bearer for the internal
 *     fire-and-forget call to dtdc-cancel on race-loss).
 *
 * The frontend body shape intentionally mirrors Prozo's `ProzoCreateShipmentInput`
 * so the rest of the app doesn't need to change when we switch providers.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  getDtdcEnv,
  jsonResponse,
  jsonError,
  verifyAdminAuth,
  DTDC_ENDPOINTS,
  type DtdcCreateShipmentResult,
} from "../_shared/dtdc-utils.ts";

// === Local input types (Prozo-shaped, intentional translation layer) =========

interface ShipmentAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
}

interface ShipmentLineItem {
  product_name: string;
  quantity: number;
  /** grams; defaults to 1000 g per item if missing or ≤ 0. */
  weight?: number | null;
  product_id?: string | null;
  unit_price: number;
}

interface CreateShipmentBody {
  orderId: string;
  totalAmount: number;
  paymentType?: string | null;
  codBalance?: number | null;
  address: ShipmentAddress;
  items: ShipmentLineItem[];
  customerEmail?: string | null;
  shipmentWeightGrams?: number;
  itemLengthCm?: number;
  itemBreadthCm?: number;
  itemHeightCm?: number;
}

/**
 * Local extension of `DtdcCreateShipmentResult` with the idempotency-only
 * fields. `alreadyExisted` is true when we short-circuited (Phase A) OR when
 * we lost a write race (Phase D). `raceLost` is true only in Phase D.
 */
interface IdempotentDtdcResult extends DtdcCreateShipmentResult {
  alreadyExisted: boolean;
  raceLost?: boolean;
}

// === Helpers =================================================================

function readStoreEnv(name: string): string {
  return (Deno.env.get(name) || "").trim().split(/\r?\n/)[0].trim();
}

interface PickupAddress {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

function getStorePickup(): PickupAddress {
  const name = readStoreEnv("STORE_NAME");
  const phone = readStoreEnv("STORE_PHONE");
  const email = readStoreEnv("STORE_EMAIL");
  const address = readStoreEnv("STORE_ADDRESS");
  const city = readStoreEnv("STORE_CITY");
  const state = readStoreEnv("STORE_STATE");
  const pincode = readStoreEnv("STORE_PINCODE");

  const missing: string[] = [];
  if (!name) missing.push("STORE_NAME");
  if (!phone) missing.push("STORE_PHONE");
  if (!email) missing.push("STORE_EMAIL");
  if (!address) missing.push("STORE_ADDRESS");
  if (!city) missing.push("STORE_CITY");
  if (!state) missing.push("STORE_STATE");
  if (!pincode) missing.push("STORE_PINCODE");

  if (missing.length > 0) {
    throw new Error(
      `Pickup address is not configured. Set ${missing.join(", ")} in Supabase Dashboard → Project Settings → Edge Functions → Secrets.`,
    );
  }

  return { name, phone, email, address, city, state, pincode };
}

function totalWeightGrams(items: ShipmentLineItem[]): number {
  return items.reduce((sum, i) => {
    const unitG = i.weight && i.weight > 0 ? i.weight : 1000;
    return sum + unitG * (i.quantity || 1);
  }, 0);
}

/** Today's date in IST formatted as "23 May 2026" — DTDC's expected `invoice_date` format. */
function dtdcInvoiceDate(): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return fmt.format(new Date());
}

function validateInput(body: CreateShipmentBody): string | null {
  if (!body || typeof body !== "object") return "Missing or invalid JSON body";
  if (!body.orderId || typeof body.orderId !== "string") return "Missing orderId";
  if (typeof body.totalAmount !== "number" || !Number.isFinite(body.totalAmount)) {
    return "Missing or invalid totalAmount";
  }
  if (!body.address || typeof body.address !== "object") return "Missing address";
  const a = body.address;
  if (!a.fullName) return "Missing address.fullName";
  if (!a.addressLine1) return "Missing address.addressLine1";
  if (!a.city) return "Missing address.city";
  if (!a.state) return "Missing address.state";
  if (!a.pincode) return "Missing address.pincode";
  if (!a.phone) return "Missing address.phone";
  if (!Array.isArray(body.items) || body.items.length === 0) return "Missing items (at least 1 required)";
  return null;
}

function extractErrorMessage(node: unknown): string {
  if (!node || typeof node !== "object") return "DTDC rejected the shipment (no reason provided)";
  const o = node as Record<string, unknown>;
  const candidates = [o.message, o.error, o.reason, o.error_message, o.errorMessage];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  if (Array.isArray(o.errors) && o.errors.length > 0) {
    const first = o.errors[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object") return extractErrorMessage(first);
  }
  return "DTDC rejected the shipment (no reason provided)";
}

function buildConsignment(
  input: CreateShipmentBody,
  customerCode: string,
  pickup: PickupAddress,
): Record<string, unknown> {
  const isCod = String(input.paymentType ?? "").toLowerCase() === "cod";
  const codAmount = isCod ? Number(input.codBalance ?? input.totalAmount ?? 0) : 0;

  const totalGrams = Math.max(1, input.shipmentWeightGrams ?? totalWeightGrams(input.items));
  const totalKg = (totalGrams / 1000).toFixed(3);

  const length = String(input.itemLengthCm ?? 20);
  const width = String(input.itemBreadthCm ?? 15);
  const height = String(input.itemHeightCm ?? 10);

  const description =
    (input.items[0]?.product_name?.trim() || "Coffee products").slice(0, 100);

  return {
    customer_code: customerCode,
    service_type_id: "B2C SMART EXPRESS",
    load_type: "NON-DOCUMENT",
    // Direction of the shipment. "Forward" = origin → destination
    // (a normal outbound delivery). The opposite would be a reverse / return
    // shipment, which we don't support yet.
    consignment_type: "Forward",
    description,
    dimension_unit: "cm",
    length,
    width,
    height,
    weight_unit: "kg",
    weight: totalKg,
    declared_value: String(input.totalAmount),
    num_pieces: "1",
    origin_details: {
      name: pickup.name,
      phone: pickup.phone,
      alternate_phone: "",
      address_line_1: pickup.address,
      address_line_2: "",
      pincode: pickup.pincode,
      city: pickup.city,
      state: pickup.state,
    },
    destination_details: {
      name: input.address.fullName,
      phone: input.address.phone,
      alternate_phone: "",
      address_line_1: input.address.addressLine1,
      address_line_2: input.address.addressLine2 || "",
      pincode: input.address.pincode,
      city: input.address.city,
      state: input.address.state,
    },
    return_details: {
      name: pickup.name,
      phone: pickup.phone,
      alternate_phone: "",
      address_line_1: pickup.address,
      address_line_2: "",
      pincode: pickup.pincode,
      city_name: pickup.city,
      state_name: pickup.state,
      email: pickup.email,
    },
    customer_reference_number: input.orderId,
    cod_collection_mode: isCod ? "CASH" : "",
    cod_amount: isCod ? String(codAmount) : "",
    commodity_id: "17",
    eway_bill: "",
    is_risk_surcharge_applicable: false,
    invoice_number: input.orderId,
    invoice_date: dtdcInvoiceDate(),
    reference_number: "",
  };
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
     * Auth gate: only admin/staff users (via browser JWT) OR backend webhooks
     * (via service-role key) can create real DTDC shipments. Anonymous or
     * customer-role callers are rejected. See _shared/dtdc-utils.ts for
     * the role list and service-role bypass logic.
     */
    const authResult = await verifyAdminAuth(req);
    if (!authResult.ok) {
      return jsonError(authResult.error, authResult.status);
    }

    let body: CreateShipmentBody | null = null;
    try {
      const text = await req.text();
      if (!text.trim()) {
        return jsonError("Request body is empty. Send a JSON body.", 400);
      }
      body = JSON.parse(text) as CreateShipmentBody;
    } catch (parseErr) {
      console.error("[DTDC] Invalid JSON body:", parseErr);
      return jsonError("Invalid JSON body", 400);
    }

    /**
     * Strict orderId guard — `orderId` is the idempotency key. Reject early
     * with a specific message before `validateInput` runs its broader checks.
     */
    if (!body || !body.orderId || typeof body.orderId !== "string") {
      return jsonError(
        "orderId is required for idempotent shipment creation",
        400,
      );
    }

    const validationError = validateInput(body);
    if (validationError) {
      return jsonError(validationError, 400);
    }

    /**
     * Phase A — Idempotency pre-flight.
     *
     * Create a service-role Supabase client and look up the order. If a
     * tracking_number is already present, short-circuit (DTDC AWB) or refuse
     * (different provider) before spending a real DTDC API call.
     *
     * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are read with raw Deno.env.get
     * (same pattern as verify-razorpay-payment lines 285-293). We throw on
     * missing — the outer try/catch surfaces this as jsonError(..., 500).
     */
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "Supabase configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
      );
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let preflight: {
      id: string;
      tracking_number: string | null;
      shipping_provider: string | null;
      status: string | null;
    } | null = null;
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, tracking_number, shipping_provider, status")
        .eq("id", body.orderId)
        .maybeSingle();
      if (error) {
        console.error(
          "[DTDC idempotency] Pre-flight lookup error:",
          error,
        );
        return jsonError(
          `Failed to look up order: ${error.message}`,
          500,
        );
      }
      if (!data) {
        return jsonError("Order not found", 404);
      }
      preflight = data as typeof preflight;
    } catch (preflightErr) {
      console.error(
        "[DTDC idempotency] Pre-flight exception:",
        preflightErr,
      );
      return jsonError(
        preflightErr instanceof Error
          ? preflightErr.message
          : "Pre-flight check failed",
        500,
      );
    }

    if (preflight.status === "cancelled") {
      return jsonError(
        "Order is cancelled; cannot create shipment",
        409,
      );
    }

    if (preflight.tracking_number) {
      const provider = preflight.shipping_provider ?? "unknown";
      if (provider === "dtdc") {
        console.log(
          `[DTDC idempotency] Short-circuit: order ${body.orderId} already has DTDC AWB ${preflight.tracking_number}`,
        );
        return jsonResponse(
          {
            success: true,
            awb: preflight.tracking_number,
            customerReferenceNumber: body.orderId,
            alreadyExisted: true,
            raw: null,
          } satisfies IdempotentDtdcResult,
          200,
        );
      }
      return jsonError(
        `Order already has a ${provider} AWB. Cancel that shipment first to switch providers.`,
        409,
      );
    }

    const env = getDtdcEnv(["apiKey", "customerCode"]);
    const pickup = getStorePickup();

    const consignment = buildConsignment(body, env.customerCode, pickup);
    const url = `${env.apiBaseUrl}${DTDC_ENDPOINTS.shipment}`;

    console.log("[DTDC] Creating shipment for order:", body.orderId);
    console.log("[DTDC] POST", url);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": env.apiKey,
      },
      body: JSON.stringify({ consignments: [consignment] }),
    });

    const raw = await res.json().catch(() => null);

    const firstNode = (() => {
      if (!raw || typeof raw !== "object") return undefined;
      const data = (raw as { data?: unknown }).data;
      return Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
    })();

    const respSuccess = firstNode?.success === true;
    const respRef = typeof firstNode?.reference_number === "string" ? firstNode.reference_number : null;
    console.log(
      "[DTDC] Response status:",
      res.status,
      "success:",
      respSuccess,
      "ref:",
      respRef ?? "(none)",
    );

    if (!res.ok) {
      const message =
        raw && typeof raw === "object"
          ? extractErrorMessage(raw)
          : `DTDC create shipment failed (HTTP ${res.status})`;
      console.error("[DTDC] Create shipment HTTP error:", res.status, message);
      return jsonError(message, res.status, { raw });
    }

    if (!firstNode) {
      console.error("[DTDC] Response missing data[0]:", raw);
      return jsonResponse(
        {
          success: false,
          awb: null,
          customerReferenceNumber: null,
          errorMessage: "DTDC response did not include a consignment result",
          raw,
        } satisfies DtdcCreateShipmentResult,
        200,
      );
    }

    const customerReferenceNumber =
      typeof firstNode.customer_reference_number === "string"
        ? firstNode.customer_reference_number
        : null;

    if (!respSuccess) {
      const errorMessage = extractErrorMessage(firstNode);
      console.warn("[DTDC] DTDC rejected the shipment:", errorMessage);

      /**
       * Race-loss detection — DTDC enforces uniqueness on
       * `customer_reference_number` (our `orderId`) at THEIR layer. If two of
       * our callers fire concurrently for the same orderId, caller 1's
       * request succeeds and caller 2's request comes back with:
       *
       *   { success: false,
       *     message: 'duplicate key value violates unique constraint
       *               "consignment_customer_reference_number_unique_idx"' }
       *
       * The shipment IS created (by caller 1) — we just need to re-fetch
       * the winner's AWB and return success. No orphan-cancel is needed
       * because DTDC never created OUR AWB (it rejected before generating
       * a reference_number).
       *
       * Match signal is intentionally narrow: both "duplicate key" AND
       * "customer_reference_number" must appear in the message. Any other
       * DTDC rejection (TAT, pincode, weight, customer-code, etc.) falls
       * through as a normal failure response.
       */
      const lowerError = errorMessage.toLowerCase();
      const isDuplicateKey =
        lowerError.includes("duplicate key") &&
        lowerError.includes("customer_reference_number");

      if (isDuplicateKey) {
        console.warn(
          `[DTDC idempotency] DTDC duplicate-key for orderId=${body.orderId} — treating as race loss, re-fetching winner.`,
        );

        let dupWinnerAwb: string | null = null;
        let dupWinnerProvider: string | null = null;
        try {
          const { data: winner, error: winnerErr } = await supabase
            .from("orders")
            .select("tracking_number, shipping_provider")
            .eq("id", body.orderId)
            .maybeSingle();
          if (winnerErr) {
            console.error(
              `[DTDC idempotency] Failed to re-fetch winner after duplicate-key for orderId=${body.orderId}:`,
              winnerErr,
            );
          } else if (winner) {
            dupWinnerAwb = (winner.tracking_number as string | null) ?? null;
            dupWinnerProvider =
              (winner.shipping_provider as string | null) ?? null;
          }
        } catch (dupRefetchErr) {
          console.error(
            `[DTDC idempotency] Re-fetch exception after duplicate-key for orderId=${body.orderId}:`,
            dupRefetchErr,
          );
        }

        if (!dupWinnerAwb || dupWinnerProvider !== "dtdc") {
          /**
           * DTDC says duplicate, but our DB doesn't yet have a DTDC AWB for
           * this order. Possible causes: the winning caller's Phase C UPDATE
           * is still in flight; or the winning caller crashed between DTDC
           * success and DB write; or someone manually cleared the row. Don't
           * fabricate success — surface the original DTDC error so the
           * caller can retry / investigate.
           */
          console.error(
            `[DTDC idempotency] DTDC said duplicate but DB has no DTDC AWB. Possible inconsistency for orderId=${body.orderId} (provider=${dupWinnerProvider} awb=${dupWinnerAwb})`,
          );
          return jsonResponse(
            {
              success: false,
              awb: null,
              customerReferenceNumber,
              errorMessage,
              raw,
            } satisfies DtdcCreateShipmentResult,
            200,
          );
        }

        console.log(
          `[DTDC idempotency] Duplicate-key resolved: orderId=${body.orderId} winner AWB=${dupWinnerAwb}`,
        );
        return jsonResponse(
          {
            success: true,
            awb: dupWinnerAwb,
            customerReferenceNumber: body.orderId,
            alreadyExisted: true,
            raceLost: true,
            raw: null,
          } satisfies IdempotentDtdcResult,
          200,
        );
      }

      return jsonResponse(
        {
          success: false,
          awb: null,
          customerReferenceNumber,
          errorMessage,
          raw,
        } satisfies DtdcCreateShipmentResult,
        200,
      );
    }

    if (!respRef) {
      console.warn("[DTDC] success=true but no reference_number in response");
      return jsonResponse(
        {
          success: false,
          awb: null,
          customerReferenceNumber,
          errorMessage: "DTDC returned success but no reference_number",
          raw,
        } satisfies DtdcCreateShipmentResult,
        200,
      );
    }

    console.log("[DTDC] Shipment created:", respRef, "for order:", body.orderId);

    /**
     * Phase C — Conditional write-back.
     *
     * `UPDATE orders SET tracking_number=respRef, shipping_provider='dtdc', ...
     *    WHERE id = body.orderId AND tracking_number IS NULL`
     *
     * The `.is("tracking_number", null)` clause makes this atomic at the row
     * level. If a concurrent caller wrote a tracking_number between our
     * Phase A SELECT and this UPDATE, our UPDATE affects 0 rows and we fall
     * through to Phase D (race-loss cleanup).
     *
     * On DB error we STILL return success with the AWB — the caller's UX
     * shouldn't break because of an internal write failure, and the orphan
     * AWB is recoverable via the operator (logged loudly).
     */
    const shipmentCreatedAt = new Date().toISOString();
    let claimSucceeded = false;
    try {
      const { data: claimed, error: claimError } = await supabase
        .from("orders")
        .update({
          tracking_number: respRef,
          shipping_provider: "dtdc",
          shipment_created_at: shipmentCreatedAt,
          status: "shipped",
        })
        .eq("id", body.orderId)
        .is("tracking_number", null)
        .select("id, tracking_number, shipping_provider");

      if (claimError) {
        console.error(
          `[DTDC idempotency] Write-back failed for order ${body.orderId} AWB ${respRef}:`,
          claimError,
        );
        return jsonResponse(
          {
            success: true,
            awb: respRef,
            customerReferenceNumber,
            alreadyExisted: false,
            raw,
          } satisfies IdempotentDtdcResult,
          200,
        );
      }

      claimSucceeded = Array.isArray(claimed) && claimed.length === 1;
    } catch (writeErr) {
      console.error(
        `[DTDC idempotency] Write-back exception for order ${body.orderId} AWB ${respRef}:`,
        writeErr,
      );
      return jsonResponse(
        {
          success: true,
          awb: respRef,
          customerReferenceNumber,
          alreadyExisted: false,
          raw,
        } satisfies IdempotentDtdcResult,
        200,
      );
    }

    if (claimSucceeded) {
      console.log(
        `[DTDC idempotency] Claim succeeded for order ${body.orderId} -> AWB ${respRef}`,
      );
      return jsonResponse(
        {
          success: true,
          awb: respRef,
          customerReferenceNumber,
          alreadyExisted: false,
          raw,
        } satisfies IdempotentDtdcResult,
        200,
      );
    }

    /**
     * Phase D — Race-loss cleanup.
     *
     * Phase C's conditional UPDATE returned 0 rows: another caller (the other
     * payment webhook, or an admin click) wrote a tracking_number between our
     * Phase A SELECT and our Phase C UPDATE. Our AWB (respRef) is now an
     * orphan at DTDC — we must cancel it to avoid paying for a duplicate
     * consignment.
     *
     * We re-fetch the order to learn the winner's AWB (which we return to
     * the caller for consistent UX), then fire a best-effort cancel on our
     * orphan via an internal call to dtdc-cancel.
     */
    let winnerAwb: string | null = null;
    let winnerProvider: string | null = null;
    try {
      const { data: winner, error: winnerErr } = await supabase
        .from("orders")
        .select("tracking_number, shipping_provider")
        .eq("id", body.orderId)
        .maybeSingle();
      if (winnerErr) {
        console.error(
          `[DTDC idempotency] Failed to re-fetch winner for order ${body.orderId}:`,
          winnerErr,
        );
      } else if (winner) {
        winnerAwb = (winner.tracking_number as string | null) ?? null;
        winnerProvider = (winner.shipping_provider as string | null) ?? null;
      }
    } catch (refetchErr) {
      console.error(
        `[DTDC idempotency] Winner re-fetch exception for order ${body.orderId}:`,
        refetchErr,
      );
    }

    console.warn(
      `[DTDC idempotency] Race loss for orderId=${body.orderId}. Our AWB ${respRef} is orphan. Winner: provider=${winnerProvider} awb=${winnerAwb}`,
    );

    /**
     * Fire-and-forget orphan cancel via internal call to dtdc-cancel.
     *
     * `DTDC_LEGACY_SERVICE_ROLE_JWT` is read with raw `Deno.env.get` (NOT the
     * `readEnv` sanitizer) so the bytes we put into the Authorization header
     * are byte-identical to what's stored as the Supabase secret. The auth
     * helper in dtdc-cancel does its own trimming when comparing.
     */
    const legacyServiceRoleJwt = Deno.env.get("DTDC_LEGACY_SERVICE_ROLE_JWT") ?? "";
    if (legacyServiceRoleJwt) {
      void fetch(`${supabaseUrl}/functions/v1/dtdc-cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${legacyServiceRoleJwt}`,
        },
        body: JSON.stringify({ awb: respRef }),
      })
        .then((r) => r.json())
        .then((result) => {
          console.log(
            `[DTDC idempotency] Orphan cancel result for ${respRef}:`,
            JSON.stringify(result),
          );
        })
        .catch((e) => {
          console.error(
            `[DTDC idempotency] Orphan cancel FAILED for ${respRef}:`,
            e instanceof Error ? e.message : e,
          );
        });
    } else {
      console.error(
        `[DTDC idempotency] Cannot fire orphan cancel for AWB ${respRef}: DTDC_LEGACY_SERVICE_ROLE_JWT is not set. Manual cancellation required at DTDC.`,
      );
    }

    return jsonResponse(
      {
        success: true,
        awb: winnerAwb ?? respRef,
        customerReferenceNumber: body.orderId,
        alreadyExisted: true,
        raw: null,
        raceLost: true,
      } satisfies IdempotentDtdcResult,
      200,
    );
  } catch (err) {
    console.error("[DTDC] Create shipment error:", err);
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
