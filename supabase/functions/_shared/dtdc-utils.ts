// Shared DTDC utility functions

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function getDTDCConfig() {
  return {
    baseUrl: Deno.env.get('DTDC_BASE_URL') || 'https://alphademodashboardapi.shipsy.io',
    apiKey: Deno.env.get('DTDC_API_KEY') || '',
    customerCode: Deno.env.get('DTDC_CUSTOMER_CODE') || 'GL017',
    trackingToken: Deno.env.get('DTDC_TRACKING_TOKEN') || '',
    env: Deno.env.get('DTDC_ENV') || 'staging',
  };
}

export async function dtdcApiCall<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    queryParams?: Record<string, string>;
    headers?: Record<string, string>;
  } = {}
): Promise<{ success: true; data: T } | { success: false; error: string; details?: unknown }> {
  const config = getDTDCConfig();
  const { method = 'GET', body, queryParams, headers = {} } = options;

  let url = `${config.baseUrl}${endpoint}`;
  
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'api-key': config.apiKey,
    ...headers,
  };

  // Log request without exposing full URL parameters
  console.log(`[DTDC] ${method} request to ${endpoint}`);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`[DTDC] Response status: ${response.status}`);
    const responseText = await response.text();
    // Don't log response body - may contain PII

    if (!response.ok) {
      return {
        success: false,
        error: `DTDC API error: ${response.status}`,
        details: responseText,
      };
    }

    try {
      const data = JSON.parse(responseText);
      return { success: true, data };
    } catch {
      return { success: true, data: responseText as T };
    }
  } catch (error) {
    console.error('[DTDC] Request failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function dtdcStreamCall(
  endpoint: string,
  queryParams: Record<string, string>
): Promise<Response> {
  const config = getDTDCConfig();
  const params = new URLSearchParams(queryParams);
  const url = `${config.baseUrl}${endpoint}?${params.toString()}`;

  // Log request without exposing parameters
  console.log(`[DTDC] GET (stream) request to ${endpoint}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'api-key': config.apiKey,
    },
  });

  return response;
}

export function formatInvoiceDate(date: Date = new Date()): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// Simple in-memory cache for tracking responses
const trackingCache = new Map<string, { data: unknown; expiry: number }>();

export function getCachedTracking(awb: string): unknown | null {
  const cached = trackingCache.get(awb);
  if (cached && cached.expiry > Date.now()) {
    console.log(`[DTDC] Cache hit for tracking`);
    return cached.data;
  }
  trackingCache.delete(awb);
  return null;
}

export function setCachedTracking(awb: string, data: unknown, ttlMinutes = 15): void {
  trackingCache.set(awb, {
    data,
    expiry: Date.now() + ttlMinutes * 60 * 1000,
  });
}
