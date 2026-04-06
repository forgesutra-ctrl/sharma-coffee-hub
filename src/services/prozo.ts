/**
 * Prozo Proship API — POST /api/auth/signin with username/password, then Bearer accessToken on other routes.
 * Dev: base path `/prozo-api` (Vite proxy → VITE_PROZO_BASE_URL).
 */

const SIGNIN_PATH = "/api/auth/signin";
const CREATE_PATH = "/api/order/create";
const TRACK_PATH = "/api/order/track";
const CANCEL_PATH = "/api/order/cancel";

const TOKEN_TTL_MS = 50 * 60 * 1000;
let accessTokenCache: { token: string; cachedAt: number } | null = null;

export type MappedOrderStatus = "confirmed" | "shipped" | "delivered" | "cancelled";

export function mapProzoStatusCode(code: number | string | null | undefined): MappedOrderStatus {
  const n = Number(code);
  switch (n) {
    case 1:
      return "confirmed";
    case 4:
      return "shipped";
    case 8:
      return "delivered";
    case 9:
      return "shipped";
    case 10:
      return "cancelled";
    default:
      return "shipped";
  }
}

function prozoBaseUrl(): string {
  if (import.meta.env.DEV) {
    return "/prozo-api";
  }
  const raw = import.meta.env.VITE_PROZO_BASE_URL as string | undefined;
  const base = (raw && raw.trim()) || "https://proshipdev.prozo.com";
  return base.replace(/\/+$/, "");
}

function stripBearerPrefix(value: string): string {
  return value.replace(/^Bearer\s+/i, "").trim();
}

function extractAccessToken(data: unknown): string | null {
  if (data == null || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const direct = o.accessToken;
  if (typeof direct === "string" && direct.trim()) return stripBearerPrefix(direct);
  const nested = o.data ?? o.result;
  if (nested != null && nested !== o && typeof nested === "object") {
    return extractAccessToken(nested);
  }
  return null;
}

/**
 * Signs in with VITE_PROZO_USERNAME / VITE_PROZO_PASSWORD. No Authorization header on this request.
 * Caches accessToken for subsequent prozoFetch calls.
 */
export async function authenticateProzo(options?: { force?: boolean }): Promise<string> {
  const force = options?.force ?? false;
  if (!force && accessTokenCache && Date.now() - accessTokenCache.cachedAt < TOKEN_TTL_MS) {
    return accessTokenCache.token;
  }

  const username = import.meta.env.VITE_PROZO_USERNAME as string | undefined;
  const password = import.meta.env.VITE_PROZO_PASSWORD as string | undefined;
  if (!username?.trim() || !password) {
    throw new Error(
      "Prozo is not configured. Set VITE_PROZO_USERNAME and VITE_PROZO_PASSWORD in your .env file.",
    );
  }

  const signinBody = { username: username.trim(), password };
  console.log("[Prozo] signin request body:", JSON.stringify(signinBody));

  const url = `${prozoBaseUrl()}${SIGNIN_PATH}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signinBody),
  });

  const raw = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      raw && typeof raw === "object" && ("message" in raw || "error" in raw)
        ? String(
            (raw as { message?: string; error?: string }).message ||
              (raw as { message?: string; error?: string }).error,
          )
        : `Prozo signin failed (${res.status})`;
    throw new Error(msg);
  }

  const token = extractAccessToken(raw);
  if (!token) {
    throw new Error("Prozo signin response did not include accessToken");
  }

  accessTokenCache = { token, cachedAt: Date.now() };
  return token;
}

async function prozoFetch(path: string, init: RequestInit = {}, authAttempt = 0): Promise<Response> {
  const accessToken = await authenticateProzo({ force: authAttempt > 0 });
  const url = `${prozoBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Content-Type", "application/json");
  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && authAttempt < 1) {
    accessTokenCache = null;
    return prozoFetch(path, init, authAttempt + 1);
  }

  return res;
}

function pickupDetailsFromEnv() {
  const name = (import.meta.env.VITE_STORE_NAME as string | undefined)?.trim();
  const phone = (import.meta.env.VITE_STORE_PHONE as string | undefined)?.trim();
  const email = (import.meta.env.VITE_STORE_EMAIL as string | undefined)?.trim();
  const address = (import.meta.env.VITE_STORE_ADDRESS as string | undefined)?.trim();
  const city = (import.meta.env.VITE_STORE_CITY as string | undefined)?.trim();
  const state = (import.meta.env.VITE_STORE_STATE as string | undefined)?.trim();
  const pincode = (import.meta.env.VITE_STORE_PINCODE as string | undefined)?.trim();

  const missing: string[] = [];
  if (!name) missing.push("VITE_STORE_NAME");
  if (!phone) missing.push("VITE_STORE_PHONE");
  if (!email) missing.push("VITE_STORE_EMAIL");
  if (!address) missing.push("VITE_STORE_ADDRESS");
  if (!city) missing.push("VITE_STORE_CITY");
  if (!state) missing.push("VITE_STORE_STATE");
  if (!pincode) missing.push("VITE_STORE_PINCODE");

  if (missing.length > 0) {
    throw new Error(
      `Prozo pickup_details: missing ${missing.join(", ")}. Add them to .env (see .env.example).`,
    );
  }

  return {
    from_name: name,
    from_phone_number: phone,
    from_email: email,
    from_address: address,
    from_city: city,
    from_state: state,
    from_pincode: pincode,
    from_country: "IN",
    gstin: "NA",
  };
}

function extractAwbFromCreateResponse(raw: unknown): string | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const result = o.result;
  if (result != null && typeof result === "object") {
    const r = result as Record<string, unknown>;
    const v = r.awb_number;
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

export interface ProzoLineItem {
  product_name: string;
  quantity: number;
  weight?: number | null;
  /** Maps to sku_id — falls back to product_name */
  product_id?: string | null;
  unit_price: number;
}

export interface ProzoShippingAddressInput {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
}

export interface ProzoCreateShipmentInput {
  /** UUID — reference, client_order_id, invoice_number */
  orderId: string;
  totalAmount: number;
  paymentType?: string | null;
  codBalance?: number | null;
  address: ProzoShippingAddressInput;
  items: ProzoLineItem[];
  /** Customer / order email for delivery_details.to_email */
  customerEmail?: string | null;
  /** Optional shipment dimensions (grams, cm); defaults used if omitted */
  shipmentWeightGrams?: number;
  itemLengthCm?: number;
  itemBreadthCm?: number;
  itemHeightCm?: number;
}

function totalWeightGrams(items: ProzoLineItem[]): number {
  return items.reduce((sum, i) => {
    const unitG = i.weight && i.weight > 0 ? i.weight : 250;
    return sum + unitG * (i.quantity || 1);
  }, 0);
}

export async function createProzoShipment(
  input: ProzoCreateShipmentInput,
): Promise<{ awb: string; raw: unknown }> {
  if (!input.orderId?.trim()) {
    throw new Error("createProzoShipment: orderId is required");
  }

  const isCod = input.paymentType === "cod";
  const codAmount = isCod ? Number(input.codBalance ?? input.totalAmount ?? 0) : 0;
  const invoiceValue = Number(input.totalAmount);

  const toAddress = [input.address.addressLine1, input.address.addressLine2]
    .filter(Boolean)
    .join(", ");

  const itemList = input.items.map((i) => ({
    item_name: i.product_name,
    sku_id: (i.product_id && String(i.product_id).trim()) || i.product_name,
    units: i.quantity,
    selling_price: Number(i.unit_price),
    item_url: "NA",
    tax: 0,
    hsn: "0",
  }));

  const weightG = Math.max(
    1,
    input.shipmentWeightGrams ?? totalWeightGrams(input.items),
  );

  const body = {
    order_type: "Forward Shipment",
    reverse: false,
    is_reverse: false,
    payment_mode: isCod ? "COD" : "PREPAID",
    cod_amount: codAmount,
    invoice_value: invoiceValue,
    reference: input.orderId,
    client_order_id: input.orderId,
    channel_name: "WEB",
    item_list: itemList,
    pickup_details: pickupDetailsFromEnv(),
    delivery_details: {
      to_name: input.address.fullName,
      to_phone_number: input.address.phone,
      to_email: (input.customerEmail ?? input.address.email ?? "").trim() || "NA",
      to_address: toAddress,
      to_city: input.address.city,
      to_state: input.address.state,
      to_pincode: input.address.pincode,
      to_country: "IN",
    },
    shipment_detail: [
      {
        item_weight: weightG,
        item_length: input.itemLengthCm ?? 20,
        item_breadth: input.itemBreadthCm ?? 15,
        item_height: input.itemHeightCm ?? 10,
      },
    ],
    invoice_number: input.orderId,
    transaction_charge: 0,
    giftwrap_charge: 0,
    shipping_charge: 0,
  };

  const res = await prozoFetch(CREATE_PATH, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      raw && typeof raw === "object" && ("message" in raw || "error" in raw)
        ? String(
            (raw as { message?: string; error?: string }).message ||
              (raw as { message?: string; error?: string }).error,
          )
        : `Prozo create order failed (${res.status})`;
    throw new Error(msg);
  }

  const awb = extractAwbFromCreateResponse(raw);
  if (!awb) {
    throw new Error("Prozo did not return result.awb_number in the response");
  }
  return { awb, raw };
}

export interface ProzoTrackingEvent {
  status: string;
  date: string;
  location: string;
  description?: string;
}

export interface ProzoTrackingResult {
  currentStatus: string;
  lastUpdatedDate: string;
  lastLocation: string;
  history: ProzoTrackingEvent[];
  mappedStatus?: MappedOrderStatus;
  courierName?: string;
  estimatedDelivery?: string;
  raw?: unknown;
}

function extractHistory(raw: unknown): ProzoTrackingEvent[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const list =
    (Array.isArray(o.trackingHistory) ? o.trackingHistory : null) ||
    (Array.isArray(o.history) ? o.history : null) ||
    (Array.isArray(o.events) ? o.events : null) ||
    (Array.isArray(o.data) ? o.data : null) ||
    [];
  if (!Array.isArray(list)) return [];

  return list.map((e: unknown) => {
    if (!e || typeof e !== "object") {
      return { status: "Update", date: "", location: "" };
    }
    const ev = e as Record<string, unknown>;
    const status =
      String(ev.status ?? ev.statusDescription ?? ev.statusName ?? ev.event ?? ev.remark ?? "Update");
    const location = String(ev.location ?? ev.city ?? ev.hub ?? ev.center ?? "");
    const date = String(ev.date ?? ev.eventDate ?? ev.timestamp ?? ev.time ?? "");
    const description = ev.description != null ? String(ev.description) : undefined;
    return { status, date, location, description };
  });
}

function extractStatusCode(raw: unknown): number | string | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const direct = o.statusCode ?? o.orderStatus ?? o.status ?? o.trackingStatus;
  if (typeof direct === "number" || typeof direct === "string") return direct;
  const inner = o.data ?? o.result;
  if (inner && typeof inner === "object") return extractStatusCode(inner);
  return undefined;
}

export async function trackProzoShipment(awb: string): Promise<ProzoTrackingResult> {
  const q = `${TRACK_PATH}?waybill=${encodeURIComponent(awb)}`;
  const res = await prozoFetch(q, { method: "GET" });
  const raw = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      raw && typeof raw === "object" && "message" in raw
        ? String((raw as { message?: string }).message)
        : `Prozo track failed (${res.status})`;
    throw new Error(msg);
  }

  const history = extractHistory(raw);
  const code = extractStatusCode(raw);
  const mappedStatus = code !== undefined && code !== null ? mapProzoStatusCode(code) : undefined;

  const first = history[0];
  let currentLabel = "In transit";
  if (mappedStatus === "delivered") currentLabel = "Delivered";
  else if (mappedStatus === "cancelled") currentLabel = "Cancelled";
  else if (mappedStatus === "confirmed") currentLabel = "Order placed";

  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const text = o.currentStatus ?? o.status ?? o.statusDescription;
    if (typeof text === "string" && text.trim()) currentLabel = text.trim();
  }

  return {
    currentStatus: currentLabel,
    lastUpdatedDate: first?.date || "",
    lastLocation: first?.location || "",
    history,
    mappedStatus,
    raw,
  };
}

/**
 * Cancel by order reference (same UUID as create: reference / client_order_id).
 */
export async function cancelProzoShipment(orderReferenceId: string): Promise<unknown> {
  if (!orderReferenceId?.trim()) {
    throw new Error("cancelProzoShipment: order reference id is required");
  }
  const res = await prozoFetch(CANCEL_PATH, {
    method: "POST",
    body: JSON.stringify({ reference: orderReferenceId.trim() }),
  });
  const raw = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      raw && typeof raw === "object" && ("message" in raw || "error" in raw)
        ? String(
            (raw as { message?: string; error?: string }).message ||
              (raw as { message?: string; error?: string }).error,
          )
        : `Prozo cancel failed (${res.status})`;
    throw new Error(msg);
  }
  return raw;
}
