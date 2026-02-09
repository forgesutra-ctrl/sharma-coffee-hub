import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface CreateConsignmentParams {
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalValue: number;
  weightKg: number;
  dimensionsCm: { length: number; width: number; height: number };
  isCOD: boolean;
  codAmount?: number;
}

interface TrackingEvent {
  status: string;
  date: string;
  location: string;
  description?: string;
}

interface TrackingResponse {
  currentStatus: string;
  lastUpdatedDate: string;
  lastLocation: string;
  history: TrackingEvent[];
  mappedStatus?: string;
  courierName?: string;
  estimatedDelivery?: string;
}

export function useNimbuspost() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createConsignment = async (params: CreateConsignmentParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-nimbuspost-shipment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          orderId: params.orderId,
          customerName: params.customerName,
          customerPhone: params.phone,
          shippingAddress: {
            fullName: params.customerName,
            addressLine1: params.address,
            city: params.city,
            state: params.state,
            pincode: params.pincode,
            phone: params.phone,
          },
          orderItems: params.items.map((i) => ({
            product_name: i.name,
            quantity: i.quantity,
            unit_price: i.price,
            total_price: i.price * i.quantity,
          })),
          totalWeight: params.weightKg,
          orderAmount: params.totalValue,
          paymentType: params.isCOD ? 'cod' : 'prepaid',
          codAmount: params.codAmount,
        }),
      });
      const data = await response.json();
      if (data.skipped) {
        throw new Error(data.message || 'Nimbuspost is not configured. Add NIMBUS_API_KEY in Supabase Dashboard → Edge Functions → Secrets.');
      }
      if (!data.success) {
        throw new Error(data.error || 'Failed to create shipment');
      }
      return { ...data, awb: data.awbNumber ?? data.awb };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const downloadShippingLabel = async (awb: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/nimbuspost-shipping-label?awb=${awb}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { error?: string }).error || 'Failed to download label');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shipping-label-${awb}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const trackShipment = async (awb: string): Promise<TrackingResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/nimbuspost-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ awb }),
      });
      const data = await response.json();
      if (data.success === false) {
        throw new Error(data.error || 'Failed to track shipment');
      }
      return {
        currentStatus: data.currentStatus,
        lastUpdatedDate: data.lastUpdatedDate,
        lastLocation: data.history?.[0]?.location ?? '',
        history: (data.history || []).map((e: { status: string; location?: string; date: string; time?: string; description?: string }) => ({
          status: e.status,
          location: e.location,
          date: e.date,
          description: e.description,
        })),
        mappedStatus: data.mappedStatus,
        courierName: data.courierName,
        estimatedDelivery: data.estimatedDelivery,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelShipment = async (awb: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/nimbuspost-cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ awb }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel shipment');
      }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createConsignment,
    downloadShippingLabel,
    trackShipment,
    cancelShipment,
  };
}
