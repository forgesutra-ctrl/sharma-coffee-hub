/**
 * DTDC service client. Wraps the 4 dtdc-* Edge Functions. Returns
 * shared shipping-types shapes so UI components can consume tracking and
 * shipment results consistently.
 *
 * Auth: every call below uses `supabase.functions.invoke()` (or a raw fetch
 * that mirrors what `invoke` does), which attaches the current user's
 * Supabase session JWT as `Authorization: Bearer <jwt>`. The dtdc-* Edge
 * Functions then validate that JWT via `verifyAdminAuth` / `verifyUserAuth`
 * in `_shared/dtdc-utils.ts`. No DTDC credentials or service-role keys
 * ever touch the browser.
 */

import { supabase } from "@/integrations/supabase/client";

// === Re-exports — shared shipping type surface (see shipping-types.ts) =======

import type {
  MappedOrderStatus,
  ShippingLineItem,
  ShippingAddressInput,
  CreateShipmentInput,
  ShippingTrackingEvent,
  ShippingTrackingResult,
} from "./shipping-types";

export type {
  MappedOrderStatus,
  ShippingLineItem,
  ShippingAddressInput,
  CreateShipmentInput,
  ShippingTrackingEvent,
  ShippingTrackingResult,
};

// === Public DTDC-specific types ==============================================

/**
 * Result returned by `createDtdcShipment`. Carries the idempotency flags
 * that the underlying Edge Function emits — UI can use `alreadyExisted` to
 * tone down "Created!" toasts, and `raceLost` is mostly diagnostic.
 */
export interface DtdcCreateShipmentResult {
  awb: string;
  alreadyExisted: boolean;
  raceLost?: boolean;
  raw: unknown;
}

// === Wire types — private; narrow the JSON we get back from Edge Functions ===
//
// These mirror the shapes produced by `supabase/functions/dtdc-*/index.ts`.
// We keep every field optional because the JSON is untrusted — a malformed
// or partial response should produce a thrown Error, not a runtime crash
// on `.foo.bar` access.

interface DtdcCreateWire {
  success?: boolean;
  awb?: string | null;
  alreadyExisted?: boolean;
  raceLost?: boolean;
  errorMessage?: string;
  /** Top-level `error` set by `jsonError(...)` on non-2xx responses. */
  error?: string;
  raw?: unknown;
}

interface DtdcTrackingEventWire {
  code?: string;
  action?: string;
  manifestNo?: string;
  origin?: string;
  destination?: string;
  /** Already parsed to "yyyy-mm-dd" by the Edge Function. */
  date?: string;
  /** Already parsed to "HH:MM" by the Edge Function. */
  time?: string;
  remarks?: string;
  /** One of: "confirmed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled" | "rto". */
  mappedStatus?: string;
}

interface DtdcTrackingWire {
  success?: boolean;
  currentStatus?: string | null;
  origin?: string | null;
  destination?: string | null;
  bookedDate?: string | null;
  events?: DtdcTrackingEventWire[];
  mappedStatus?: string;
  errorMessage?: string;
  error?: string;
  raw?: unknown;
}

interface DtdcCancelWire {
  success?: boolean;
  errorMessage?: string;
  error?: string;
  raw?: unknown;
}

interface DtdcLabelBase64Wire {
  success?: boolean;
  format?: string;
  base64?: string;
  referenceNumber?: string;
  errorMessage?: string;
  error?: string;
  raw?: unknown;
}

// === Helpers =================================================================

/**
 * Convert DTDC's 6-value `mappedStatus` union to the 4-value
 * `MappedOrderStatus`. Two collapses are intentional:
 *   - "out_for_delivery" → "shipped"  (UI doesn't distinguish; the human
 *                                      `currentStatus` text still tells the
 *                                      customer what's happening)
 *   - "rto"              → "cancelled" (from the customer's POV, a returned
 *                                       shipment is a cancelled order)
 */
function mapDtdcStatusToShippingStatus(
  value: string | undefined,
): MappedOrderStatus | undefined {
  if (!value) return undefined;
  switch (value) {
    case "confirmed":
      return "confirmed";
    case "shipped":
      return "shipped";
    case "out_for_delivery":
      return "shipped";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    case "rto":
      return "cancelled";
    default:
      return undefined;
  }
}

/**
 * Build a human-readable current status string. Prefers the DTDC-provided
 * text (`trackHeader.strStatus`); falls back to a label derived from the
 * normalized `mappedStatus`. Uses the same precedence as typical tracking
 * adapters: prefer carrier text, then fall back to mapped status labels.
 */
function deriveCurrentStatus(
  raw: string | null | undefined,
  mapped: MappedOrderStatus | undefined,
): string {
  if (raw && raw.trim()) return raw.trim();
  switch (mapped) {
    case "delivered":
      return "Delivered";
    case "shipped":
      return "In transit";
    case "confirmed":
      return "Order placed";
    case "cancelled":
      return "Cancelled";
    default:
      return "In transit";
  }
}

/** "yyyy-mm-dd" + "HH:MM" → "yyyy-mm-dd HH:MM" (either side may be empty). */
function combineDateTime(
  date: string | undefined,
  time: string | undefined,
): string {
  const d = (date ?? "").trim();
  const t = (time ?? "").trim();
  if (d && t) return `${d} ${t}`;
  return d || t || "";
}

// === Public API ==============================================================

/**
 * Create a DTDC shipment for the given order. The body shape matches
 * `CreateShipmentInput` so call sites can build arguments from shipping-types.
 *
 * Idempotent at the Edge Function layer: calling twice for the same
 * `orderId` will only ever produce one real AWB. The returned
 * `alreadyExisted` flag is true when the second call short-circuited or
 * lost a write race; the returned `awb` is always the canonical winning
 * value.
 */
export async function createDtdcShipment(
  input: CreateShipmentInput,
): Promise<DtdcCreateShipmentResult> {
  const body = {
    orderId: input.orderId,
    totalAmount: input.totalAmount,
    paymentType: input.paymentType,
    codBalance: input.codBalance,
    customerEmail: input.customerEmail ?? input.address.email ?? "",
    address: {
      fullName: input.address.fullName,
      addressLine1: input.address.addressLine1,
      addressLine2: input.address.addressLine2 || "",
      city: input.address.city,
      state: input.address.state,
      pincode: input.address.pincode,
      phone: input.address.phone,
      email: input.address.email || "",
    },
    items: input.items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      weight: i.weight ?? 250,
      product_id: i.product_id ?? null,
      unit_price: i.unit_price,
    })),
    shipmentWeightGrams: input.shipmentWeightGrams,
    itemLengthCm: input.itemLengthCm,
    itemBreadthCm: input.itemBreadthCm,
    itemHeightCm: input.itemHeightCm,
  };

  const { data, error } = await supabase.functions.invoke<DtdcCreateWire>(
    "dtdc-create-shipment",
    { body },
  );

  if (error || !data) {
    throw new Error(
      "createDtdcShipment: " + (error?.message || data?.error || "unknown"),
    );
  }
  if (data.success === false) {
    throw new Error(
      "createDtdcShipment: " +
        (data.errorMessage || "DTDC rejected the shipment"),
    );
  }
  if (!data.awb) {
    throw new Error("createDtdcShipment: DTDC did not return an AWB");
  }

  return {
    awb: data.awb,
    alreadyExisted: data.alreadyExisted ?? false,
    raceLost: data.raceLost,
    raw: data.raw,
  };
}

/**
 * Track a DTDC shipment by AWB. Returns a `ShippingTrackingResult` value.
 * The adapter:
 *   - Sorts/picks the newest event (Edge Function already sorts desc).
 *   - Collapses DTDC's 6-value `mappedStatus` to the 4-value union.
 *   - Synthesizes `courierName: "DTDC"` (DTDC tracking has no courier name).
 *   - Omits `estimatedDelivery` (DTDC tracking has no ETA field).
 */
export async function trackDtdcShipment(
  awb: string,
): Promise<ShippingTrackingResult> {
  const trimmed = awb?.trim();
  if (!trimmed) {
    throw new Error("trackDtdcShipment: AWB is required");
  }

  const { data, error } = await supabase.functions.invoke<DtdcTrackingWire>(
    "dtdc-track",
    { body: { awb: trimmed } },
  );

  if (error || !data) {
    throw new Error(
      "trackDtdcShipment: " + (error?.message || data?.error || "unknown"),
    );
  }
  if (data.success === false) {
    throw new Error(
      "trackDtdcShipment: " + (data.errorMessage || "Tracking failed"),
    );
  }

  const eventsWire = Array.isArray(data.events) ? data.events : [];
  const first = eventsWire[0];

  const mappedStatus = mapDtdcStatusToShippingStatus(data.mappedStatus);
  const currentStatus = deriveCurrentStatus(data.currentStatus, mappedStatus);

  const lastUpdatedDate = first
    ? combineDateTime(first.date, first.time)
    : (data.bookedDate ?? "");

  const lastLocation =
    (first?.origin && first.origin.trim()) ||
    (first?.destination && first.destination.trim()) ||
    (data.origin && data.origin.trim()) ||
    "";

  const history: ShippingTrackingEvent[] = eventsWire.map((e) => {
    const remarks = e.remarks?.trim();
    return {
      status: e.action || "",
      date: combineDateTime(e.date, e.time),
      location: e.origin || e.destination || "",
      description: remarks || undefined,
    };
  });

  return {
    currentStatus,
    lastUpdatedDate,
    lastLocation,
    history,
    mappedStatus,
    courierName: "DTDC",
    estimatedDelivery: undefined,
    raw: data.raw,
  };
}

/**
 * Cancel a DTDC shipment by AWB.
 *
 * NOTE: The argument is the AWB (consignment number), NOT the order UUID.
 * DTDC's cancel endpoint only accepts AWBs, so the caller is responsible
 * for resolving order → AWB before invoking this function.
 */
export async function cancelDtdcShipment(awb: string): Promise<unknown> {
  const trimmed = awb?.trim();
  if (!trimmed) {
    throw new Error("cancelDtdcShipment: AWB is required");
  }

  const { data, error } = await supabase.functions.invoke<DtdcCancelWire>(
    "dtdc-cancel",
    { body: { awb: trimmed } },
  );

  if (error || !data) {
    throw new Error(
      "cancelDtdcShipment: " + (error?.message || data?.error || "unknown"),
    );
  }
  if (data.success === false) {
    throw new Error(
      "cancelDtdcShipment: " + (data.errorMessage || "Cancellation failed"),
    );
  }

  return data.raw;
}

/**
 * Download / retrieve a DTDC shipping label.
 *
 * Two formats:
 *   - "pdf" (default): returns a `Blob` (raw PDF bytes). Use the
 *     `downloadLabelPdf` helper below to trigger a browser download.
 *   - "base64": returns the base64-encoded PDF string.
 *
 * The "pdf" path uses a raw `fetch` (not `supabase.functions.invoke`)
 * because the Edge Function streams `application/pdf` bytes for that
 * format, and the invoke helper only handles JSON. The session JWT is
 * attached manually so the function's `verifyAdminAuth` gate still works.
 */
export async function getDtdcShippingLabel(
  awb: string,
  format: "pdf" | "base64" = "pdf",
): Promise<Blob | string> {
  const trimmed = awb?.trim();
  if (!trimmed) {
    throw new Error("getDtdcShippingLabel: AWB is required");
  }

  if (format === "pdf") {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("getDtdcShippingLabel: Not authenticated");
    }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!baseUrl) {
      throw new Error(
        "getDtdcShippingLabel: VITE_SUPABASE_URL is not configured",
      );
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/functions/v1/dtdc-shipping-label`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        referenceNumber: trimmed,
        labelFormat: "pdf",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `getDtdcShippingLabel: Label fetch failed: ${res.status} ${text.slice(0, 200)}`,
      );
    }
    return await res.blob();
  }

  const { data, error } = await supabase.functions.invoke<DtdcLabelBase64Wire>(
    "dtdc-shipping-label",
    {
      body: {
        referenceNumber: trimmed,
        labelFormat: "base64",
      },
    },
  );

  if (error || !data) {
    throw new Error(
      "getDtdcShippingLabel: " + (error?.message || data?.error || "unknown"),
    );
  }
  if (data.success === false) {
    throw new Error(
      "getDtdcShippingLabel: " +
        (data.errorMessage || "Label generation failed"),
    );
  }
  if (!data.base64) {
    throw new Error("getDtdcShippingLabel: DTDC did not return label data");
  }
  return data.base64;
}

/**
 * Trigger a browser download of a PDF blob. Use after
 * `await getDtdcShippingLabel(awb)` returns a Blob.
 *
 * Example:
 *   const blob = await getDtdcShippingLabel(awb);
 *   if (blob instanceof Blob) downloadLabelPdf(blob, `dtdc-${awb}.pdf`);
 */
export function downloadLabelPdf(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
