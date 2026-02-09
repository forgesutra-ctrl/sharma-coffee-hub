// Shared Nimbuspost utility functions for Edge Functions
// Authentication: NIMBUS_API_KEY (header NP-API-KEY)

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const NIMBUSPOST_CONFIG = {
  baseURL: "https://ship.nimbuspost.com/api",
  trackingDomain: "sharmacoffeeworks.odrtrk.live",
  warehouse: {
    warehouse_name: "Sharma Coffee works",
    name: "Varun Sharma",
    address: "Opp KSRTC Bus stand, Madikeri",
    address_2: "",
    city: "MADIKERI",
    state: "KARNATAKA",
    pincode: "571201",
    phone: "8762988145",
  },
  originPincode: "571201",
  gstNumber: "29ASCPV6730G1ZE",
};

function getApiKey(): string {
  const apiKey = (Deno.env.get("NIMBUS_API_KEY") || "").trim().split(/\r?\n/)[0].trim();
  if (!apiKey) {
    throw new Error("NIMBUS_API_KEY is not set. Add it in Supabase Dashboard → Project Settings → Edge Functions → Secrets.");
  }
  return apiKey;
}

export async function nimbuspostRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
    queryParams?: Record<string, string>;
  } = {}
): Promise<{ status?: boolean; data?: T; message?: string }> {
  const apiKey = getApiKey();
  const { method = "GET", body, queryParams } = options;

  let url = `${NIMBUSPOST_CONFIG.baseURL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    method,
    headers: {
      "NP-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Nimbuspost API error: ${response.status}`);
  }

  return data;
}

/** Returns NIMBUS_API_KEY for use in raw fetch (e.g. when response is not JSON, e.g. PDF). */
export function getNimbusApiKey(): string {
  return getApiKey();
}

export const SHIPPING_STATUS_MAP: Record<string, string> = {
  "Shipment Booked": "processing",
  "Pickup Scheduled": "processing",
  "In Transit": "shipped",
  "Out for Delivery": "out_for_delivery",
  Delivered: "delivered",
  RTO: "returned",
  "RTO Delivered": "returned",
  Cancelled: "cancelled",
  Exception: "exception",
  Failed: "failed",
  Lost: "lost",
  Damaged: "damaged",
};
