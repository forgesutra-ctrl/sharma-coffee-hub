export const NIMBUSPOST_TRACKING_DOMAIN = "sharmacoffeeworks.odrtrk.live";

export function getTrackingUrl(awb: string): string {
  return `https://${NIMBUSPOST_TRACKING_DOMAIN}/${awb}`;
}

export const SHIPPING_STATUS_LABELS: Record<string, string> = {
  processing: "Processing",
  shipped: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  returned: "Returned",
  cancelled: "Cancelled",
  exception: "Exception",
  failed: "Failed",
};

export const SHIPPING_STATUS_COLORS: Record<string, string> = {
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  returned: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  exception: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
};
