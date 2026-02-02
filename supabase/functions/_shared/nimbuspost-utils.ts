// Shared Nimbuspost utility functions for Edge Functions

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const NIMBUSPOST_CONFIG = {
  baseURL: "https://api.nimbuspost.com/v1",
  email: Deno.env.get("NIMBUSPOST_EMAIL") || "18762988145+3184@automatic321signup.com",
  password: Deno.env.get("NIMBUSPOST_PASSWORD") || "AfGcEkjpbm",
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

let authToken: string | null = null;
let tokenExpiry: number | null = null;

export async function getNimbuspostToken(): Promise<string> {
  if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
    return authToken;
  }

  const response = await fetch(`${NIMBUSPOST_CONFIG.baseURL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: NIMBUSPOST_CONFIG.email,
      password: NIMBUSPOST_CONFIG.password,
    }),
  });

  const data = await response.json();

  if (data.status && data.data) {
    authToken = data.data;
    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return authToken;
  }

  throw new Error(data.message || "Nimbuspost authentication failed");
}

export async function nimbuspostRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
    queryParams?: Record<string, string>;
  } = {}
): Promise<{ status?: boolean; data?: T; message?: string }> {
  const token = await getNimbuspostToken();
  const { method = "GET", body, queryParams } = options;

  let url = `${NIMBUSPOST_CONFIG.baseURL}${endpoint}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
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
