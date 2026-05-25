/**
 * DTDC create-shipment Edge Function.
 *
 * POST a Prozo-shaped order body to this endpoint and it will:
 *   1. Validate the input.
 *   2. Translate it into the DTDC "softdata" wire format (single-parcel).
 *   3. POST it to DTDC's Order Upload API with the api-key header.
 *   4. Return a normalized JSON result containing the AWB.
 *
 * Credentials live in Supabase secrets (DTDC_API_KEY, DTDC_CUSTOMER_CODE,
 * optional DTDC_API_BASE_URL) and pickup-address details live in Supabase
 * secrets too (STORE_NAME, STORE_PHONE, STORE_EMAIL, STORE_ADDRESS,
 * STORE_CITY, STORE_STATE, STORE_PINCODE). Nothing is read from the browser.
 *
 * The frontend body shape intentionally mirrors Prozo's `ProzoCreateShipmentInput`
 * so the rest of the app doesn't need to change when we switch providers.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

    const validationError = validateInput(body);
    if (validationError) {
      return jsonError(validationError, 400);
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
    return jsonResponse(
      {
        success: true,
        awb: respRef,
        customerReferenceNumber,
        raw,
      } satisfies DtdcCreateShipmentResult,
      200,
    );
  } catch (err) {
    console.error("[DTDC] Create shipment error:", err);
    return jsonError(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
