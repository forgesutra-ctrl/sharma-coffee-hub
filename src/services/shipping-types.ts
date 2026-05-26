/**
 * Carrier-neutral shipping types shared by the DTDC client and UI layers.
 * Names retain the historical Prozo prefix for backward compatibility with
 * existing imports and call sites.
 *
 * NOTE: Prozo* identifiers will be renamed to Shipping* in a follow-up commit.
 */

export type MappedOrderStatus = "confirmed" | "shipped" | "delivered" | "cancelled";

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
