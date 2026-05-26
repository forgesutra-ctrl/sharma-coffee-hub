/**
 * Carrier-neutral shipping types shared by the DTDC client and UI layers.
 */

export type MappedOrderStatus = "confirmed" | "shipped" | "delivered" | "cancelled";

export interface ShippingLineItem {
  product_name: string;
  quantity: number;
  weight?: number | null;
  /** Maps to sku_id — falls back to product_name */
  product_id?: string | null;
  unit_price: number;
}

export interface ShippingAddressInput {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email?: string;
}

export interface CreateShipmentInput {
  /** UUID — reference, client_order_id, invoice_number */
  orderId: string;
  totalAmount: number;
  paymentType?: string | null;
  codBalance?: number | null;
  address: ShippingAddressInput;
  items: ShippingLineItem[];
  /** Customer / order email for delivery_details.to_email */
  customerEmail?: string | null;
  /** Optional shipment dimensions (grams, cm); defaults used if omitted */
  shipmentWeightGrams?: number;
  itemLengthCm?: number;
  itemBreadthCm?: number;
  itemHeightCm?: number;
}

export interface ShippingTrackingEvent {
  status: string;
  date: string;
  location: string;
  description?: string;
}

export interface ShippingTrackingResult {
  currentStatus: string;
  lastUpdatedDate: string;
  lastLocation: string;
  history: ShippingTrackingEvent[];
  mappedStatus?: MappedOrderStatus;
  courierName?: string;
  estimatedDelivery?: string;
  raw?: unknown;
}
