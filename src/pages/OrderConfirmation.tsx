import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/coffee/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Package, MapPin, CreditCard, Loader2, ArrowRight } from "lucide-react";
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
  created_at: string;
  order_items: OrderItem[];
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
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading your order...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  const hasSubscriptionItems = order.order_items.some(item => item.is_subscription);

  return (
    <Layout>
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="capitalize">{order.payment_type === "cod" ? "Cash on Delivery" : "Online Payment"}</span>
              </div>
              <div className="pt-2 border-t flex justify-between font-semibold">
                <span>Total Paid</span>
                <span>₹{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Support Message */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Need help? Contact us at{" "}
            <a href="mailto:support@sharmacoffee.com" className="text-primary hover:underline">
              support@sharmacoffee.com
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default OrderConfirmation;
