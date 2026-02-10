import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Package, MapPin, CreditCard, Loader2, ArrowRight, Truck, ExternalLink, HelpCircle, MessageCircle } from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  is_subscription: boolean;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  shipping_amount?: number;
  shipping_charge?: number;
  shipping_address: {
    fullName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
    landmark: string;
  };
  payment_type: string;
  cod_advance_paid?: number | null;
  cod_handling_fee?: number | null;
  cod_balance?: number | null;
  created_at: string;
  order_items: OrderItem[];
  nimbuspost_awb_number?: string | null;
  shipment_created_at?: string | null;
}

const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("OrderConfirmation mounted with orderId:", orderId);

    // Clean up any Razorpay modal elements that might be blocking interaction
    const cleanupRazorpay = () => {
      // Remove Razorpay backdrop and modal elements
      const razorpayElements = document.querySelectorAll(
        '.razorpay-container, .razorpay-backdrop, [class*="razorpay-container"], [class*="razorpay-backdrop"], iframe[src*="razorpay"], iframe[src*="checkout.razorpay.com"]'
      );
      
      razorpayElements.forEach((el) => {
        console.log("[OrderConfirmation] Removing Razorpay element:", el.className || el.id);
        el.remove();
      });

      // Also check for any invisible overlays blocking interaction
      const allOverlays = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
      allOverlays.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const styles = getComputedStyle(htmlEl);
        // Check if it's a blocking overlay (high z-index, full screen)
        if (
          parseInt(styles.zIndex) > 1000 &&
          (styles.width === '100vw' || styles.width === '100%') &&
          (styles.height === '100vh' || styles.height === '100%')
        ) {
          // Check if it's not a known component (toaster, sonner, etc.)
          const className = htmlEl.className || '';
          if (!className.includes('toaster') && 
              !className.includes('sonner') && 
              !className.includes('razorpay')) {
            console.log("[OrderConfirmation] Found potential blocking overlay:", className);
            // Don't remove, but log it for debugging
          }
        }
      });
    };

    // Clean up immediately on mount
    cleanupRazorpay();

    // Also clean up after a short delay to catch any late-loading elements
    const cleanupTimeout = setTimeout(cleanupRazorpay, 100);

    const fetchOrder = async () => {
      if (!orderId) {
        console.error("No orderId provided");
        setError("Order ID is missing");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching order from Supabase:", orderId);

        // Query order with items - nimbuspost_awb_number and shipment_created_at may not exist in all schemas
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(`
            *,
            order_items (*)
          `)
          .eq("id", orderId)
          .maybeSingle();

        console.log("Supabase query result:", { orderData, orderError });

        if (orderError) {
          console.error("Supabase error:", orderError);
          throw orderError;
        }

        if (!orderData) {
          console.error("Order not found");
          setError("Order not found");
          setLoading(false);
          return;
        }

        console.log("Order fetched successfully:", orderData);
        setOrder(orderData as Order);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError(err instanceof Error ? err.message : "Failed to load order");
      } finally {
        setLoading(false);
        // Clean up again after data loads
        cleanupRazorpay();
      }
    };

    fetchOrder();

    return () => {
      clearTimeout(cleanupTimeout);
      cleanupRazorpay();
    };
  }, [orderId]);

  // Debug effect to check page interactivity
  useEffect(() => {
    console.log("OrderConfirmation render state:", {
      loading,
      order: !!order,
      error: !!error,
      bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
    });

    // Check for blocking elements
    const checkBlockingElements = () => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const elementAtCenter = document.elementFromPoint(centerX, centerY);
      
      console.log("[OrderConfirmation] Element at center of screen:", {
        tag: elementAtCenter?.tagName,
        className: elementAtCenter?.className,
        id: elementAtCenter?.id,
        pointerEvents: getComputedStyle(elementAtCenter || document.body).pointerEvents,
        zIndex: getComputedStyle(elementAtCenter || document.body).zIndex,
      });

      // Check for overlays
      const overlays = document.querySelectorAll('[style*="z-index"]');
      overlays.forEach((el) => {
        const styles = getComputedStyle(el);
        const zIndex = parseInt(styles.zIndex);
        if (zIndex > 1000) {
          console.log("[OrderConfirmation] High z-index element:", {
            tag: el.tagName,
            className: el.className,
            zIndex: styles.zIndex,
            pointerEvents: styles.pointerEvents,
            display: styles.display,
            visibility: styles.visibility,
          });
        }
      });
    };

    // Check after render
    setTimeout(checkBlockingElements, 100);
  }, [loading, order, error]);

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading your order...</p>
          </div>
        </div>
    );
  }

  if (error || !order) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {error || "We couldn't find your order. Please check your order history."}
              </p>
              <Button asChild>
                <Link to="/account/orders">View Orders</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  const hasSubscriptionItems = order.order_items.some(item => item.is_subscription);

  return (
    <>
      {/* Temporary test button to verify interactivity */}
      <button
        onClick={() => {
          alert("Test button clicked - page is interactive!");
          console.log("[OrderConfirmation] Test button clicked");
        }}
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          zIndex: 99999,
          padding: "8px 16px",
          backgroundColor: "#C8A97E",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Test Interactivity
      </button>
      <div className="container mx-auto px-4 py-12 max-w-4xl" style={{ pointerEvents: "auto" }}>
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground">
            Thank you for your order. We've sent a confirmation email to{" "}
            <span className="font-medium">{order.shipping_address.email}</span>
          </p>
        </div>

        {/* Order Number */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order #{order.order_number}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {format(new Date(order.created_at), "MMM dd, yyyy 'at' h:mm a")}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Subscription Notice */}
        {hasSubscriptionItems && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">Subscription Order</h3>
                  <p className="text-sm text-muted-foreground">
                    Your subscription has been activated! You'll receive monthly deliveries
                    and can manage your subscription from your account dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center pb-4 border-b last:border-0 last:pb-0"
                >
                  <div>
                    <h4 className="font-medium">{item.product_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity}
                      {item.is_subscription && (
                        <span className="ml-2 text-primary font-medium">• Subscription</span>
                      )}
                    </p>
                  </div>
                  <span className="font-medium">
                    ₹{(item.unit_price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p className="font-medium">{order.shipping_address.fullName}</p>
              <p>{order.shipping_address.addressLine1}</p>
              {order.shipping_address.addressLine2 && (
                <p>{order.shipping_address.addressLine2}</p>
              )}
              <p>
                {order.shipping_address.city}, {order.shipping_address.state} -{" "}
                {order.shipping_address.pincode}
              </p>
              {order.shipping_address.landmark && (
                <p className="text-muted-foreground">
                  Landmark: {order.shipping_address.landmark}
                </p>
              )}
              <p className="pt-2">
                <span className="text-muted-foreground">Phone:</span>{" "}
                {order.shipping_address.phone}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{order.subtotal.toFixed(2)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-₹{order.discount_amount.toFixed(2)}</span>
                </div>
              )}
              {order.shipping_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>₹{order.shipping_amount.toFixed(2)}</span>
                </div>
              )}
              {order.payment_type === "cod" && order.cod_handling_fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">COD Handling Fee</span>
                  <span>₹{order.cod_handling_fee?.toFixed(2) || "0.00"}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="capitalize">{order.payment_type === "cod" ? "Cash on Delivery" : "Online Payment"}</span>
              </div>
              
              {/* COD Breakdown */}
              {order.payment_type === "cod" && (
                <>
                  <div className="pt-2 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Upfront Payment</span>
                      <span className="font-medium text-primary">₹{((order.cod_advance_paid || 0) + (order.cod_handling_fee || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground pl-2">
                      <span>• Advance (from product): ₹{order.cod_advance_paid?.toFixed(2) || "100.00"}</span>
                      <span>• COD Handling Fee: ₹{order.cod_handling_fee?.toFixed(2) || "50.00"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance on Delivery</span>
                      <span className="font-medium">₹{order.cod_balance?.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t">
                      <span className="text-muted-foreground">Total Order Value</span>
                      <span className="font-semibold">₹{order.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground pt-1 italic">
                      Total = Product (₹{order.subtotal.toFixed(2)}) + Shipping (₹{order.shipping_amount?.toFixed(2) || "0.00"}) + COD Handling (₹{order.cod_handling_fee?.toFixed(2) || "0.00"})
                    </div>
                  </div>
                </>
              )}
              
              {/* Prepaid Payment */}
              {order.payment_type !== "cod" && (
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>Total Paid</span>
                  <span>₹{order.total_amount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tracking Information */}
        {order.nimbuspost_awb_number ? (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" />
                Track Your Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tracking Number (AWB)</p>
                  <p className="text-lg font-mono font-semibold text-primary">
                    {order.nimbuspost_awb_number}
                  </p>
                </div>
                <Button asChild className="w-full sm:w-auto">
                  <a
                    href={`https://sharmacoffeeworks.odrtrk.live/tracking?awb=${order.nimbuspost_awb_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    Track Shipment
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
                {order.shipment_created_at && (
                  <p className="text-xs text-muted-foreground">
                    Shipment created on {format(new Date(order.shipment_created_at), "MMM dd, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-muted">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Truck className="w-5 h-5" />
                <div>
                  <p className="text-sm font-medium">Shipment being prepared</p>
                  <p className="text-xs">Your tracking number will be available shortly. We'll notify you once it's ready.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/account/orders">
              <Package className="w-4 h-4 mr-2" />
              View All Orders
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/shop">
              Continue Shopping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Need Help Card */}
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-300 border-2 shadow-lg mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <HelpCircle className="w-6 h-6" />
              Questions? We're Here to Help!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">We're available anytime to assist you</p>
            
            <div className="space-y-2 bg-white p-4 rounded-lg border border-green-200">
              <p className="font-bold text-gray-800 mb-3">📞 CALL US:</p>
              
              <p className="flex items-center gap-3">
                <span className="text-2xl font-bold text-green-600">🔴</span>
                <a href="tel:+918762988145" className="text-lg font-bold text-green-700 hover:text-green-900 underline">
                  +91 8762 988 145
                </a>
                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded font-semibold">PRIMARY</span>
              </p>
              
              <p className="flex items-center gap-3">
                <span className="text-2xl font-bold text-amber-500">🟡</span>
                <a href="tel:+916363235357" className="text-lg font-bold text-blue-600 hover:text-blue-900 underline">
                  +91 6363 235 357
                </a>
              </p>
              
              <p className="flex items-center gap-3">
                <span className="text-2xl font-bold text-orange-500">🟠</span>
                <a href="tel:+918431891360" className="text-lg font-bold text-blue-600 hover:text-blue-900 underline">
                  +91 84318 91360
                </a>
                <span className="text-xs text-gray-500">(Staff)</span>
              </p>
              
              <p className="border-t border-green-200 pt-3 mt-3">
                <a href="https://wa.me/918762988145" target="_blank" rel="noopener noreferrer" 
                   className="text-lg font-bold text-green-600 hover:text-green-800 underline flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  💬 Chat on WhatsApp (Best Option)
                </a>
              </p>
            </div>
            
            <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
              ⏰ Available: 9 AM - 6 PM IST (Monday - Saturday)
              <br/>
              ⚡ Average Response Time: 5 minutes
            </p>
          </CardContent>
        </Card>

        {/* Support Message */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Need help? Contact us at{" "}
            <a href="mailto:ask@sharmacoffeeworks.com" className="text-primary hover:underline">
              ask@sharmacoffeeworks.com
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

export default OrderConfirmation;
