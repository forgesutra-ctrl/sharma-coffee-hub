import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Package, MapPin, CreditCard, Loader2, ArrowRight, Calendar, Truck, HelpCircle, MessageCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";

interface SubscriptionDetails {
  id: string;
  razorpay_subscription_id: string | null;
  status: string;
  quantity: number;
  preferred_delivery_date: number | null;
  next_delivery_date: string | null;
  next_billing_date: string | null;
  total_deliveries: number;
  completed_deliveries: number;
  shipping_address: {
    fullName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
  created_at: string;
  product: {
    id: string;
    name: string;
    image_url: string | null;
    description: string | null;
  } | null;
  variant: {
    id: string;
    weight: number;
    price: number;
  } | null;
  plan: {
    id: string;
    name: string;
    frequency: string;
    billing_cycle?: number;
  } | null;
}

const SubscriptionConfirmation = () => {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Helper: check if a string is a valid UUID (for internal subscription IDs)
  const isUuid = (value: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  };

  useEffect(() => {
    if (subscriptionId && user) {
      fetchSubscription();
    } else if (!user) {
      setError("Please log in to view subscription details");
      setLoading(false);
    }
  }, [subscriptionId, user, retryCount]);

  const fetchSubscription = async () => {
    if (!subscriptionId || !user) return;

    setLoading(true);
    setError(null);

    try {
      // The subscriptionId from URL is the Razorpay subscription ID (e.g., "sub_S6qz1aXt4rH4S2")
      // First try to match by razorpay_subscription_id, then by internal id
      
      // Try by razorpay_subscription_id first (most likely case)
      // Select all columns (using * to avoid column name issues)
      const { data: byRazorpayId, error: razorpayError } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      
      if (razorpayError) {
        console.error("Error querying by razorpay_subscription_id:", razorpayError);
        throw razorpayError;
      }
      
      if (byRazorpayId) {
        // Found by Razorpay ID - fetch related data
        const subscriptionData = await fetchSubscriptionDetails(byRazorpayId);
        setSubscription(subscriptionData);
        setLoading(false);
        return;
      }

      // If not found by Razorpay ID, try by internal UUID ID (only if the value looks like a UUID).
      // This avoids Postgres errors like "invalid input syntax for type uuid: 'sub_xxx'".
      if (isUuid(subscriptionId)) {
        const { data: byId, error: idError } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("id", subscriptionId)
          .maybeSingle();
        
        if (idError) {
          console.error("Error querying by id:", idError);
          throw idError;
        }
        
        if (byId) {
          // Found by internal ID - fetch related data
          const subscriptionData = await fetchSubscriptionDetails(byId);
          setSubscription(subscriptionData);
          setLoading(false);
          return;
        }
      }
      
      // Not found by either ID - subscription might not be created yet (webhook delay)
      if (retryCount < 5) {
        console.log(`Subscription not found, retrying... (${retryCount + 1}/5)`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 2000);
        return;
      }
      
      // After 5 retries, show error
      throw new Error("Subscription not found. It may still be processing. Please check your subscriptions page.");
    } catch (err: any) {
      console.error("Error fetching subscription:", err);
      setError(err.message || "Failed to load subscription details");
      setLoading(false);
    }
  };

  const fetchSubscriptionDetails = async (sub: any): Promise<SubscriptionDetails> => {
    // Fetch product, variant, and plan details
    // Note: plan_id might not exist in the table, so we'll handle it gracefully
    const [productResult, variantResult, planResult] = await Promise.all([
      sub.product_id
        ? supabase.from("products").select("id, name, image_url, description").eq("id", sub.product_id).maybeSingle()
        : Promise.resolve({ data: null }),
      sub.variant_id
        ? supabase.from("product_variants").select("id, weight, price").eq("id", sub.variant_id).maybeSingle()
        : Promise.resolve({ data: null }),
      // Only fetch plan if plan_id exists in the subscription object
      sub.plan_id
        ? supabase.from("subscription_plans").select("id, name, billing_cycle").eq("id", sub.plan_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      ...sub,
      product: productResult.data,
      variant: variantResult.data,
      plan: planResult.data ? {
        id: planResult.data.id,
        name: planResult.data.name,
        frequency: planResult.data.billing_cycle || "monthly",
        billing_cycle: 1, // Default to 1 if not specified
      } : null,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            {retryCount > 0 ? "Waiting for subscription to be activated..." : "Loading subscription details..."}
          </p>
          {retryCount > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few seconds. Please wait...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Subscription Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || "We couldn't find your subscription. It may still be processing."}
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to="/account/subscriptions">View My Subscriptions</Link>
              </Button>
              {retryCount < 5 && (
                <Button variant="outline" onClick={() => setRetryCount(0)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPrice = subscription.variant ? subscription.variant.price * subscription.quantity : 0;
  const deliveryDate = subscription.next_delivery_date
    ? format(new Date(subscription.next_delivery_date), "MMMM dd, yyyy")
    : "To be scheduled";

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Subscription Placed Successfully! 🎉</h1>
        <p className="text-lg text-muted-foreground mb-2">
          Thank you for your order, dear valued customer.
        </p>
        <p className="text-muted-foreground">
          Your subscription is now active. We've sent a confirmation email to{" "}
          <span className="font-medium">{subscription.shipping_address.email}</span>
        </p>
      </div>

      {/* Subscription ID */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Subscription #{subscription.id.slice(0, 8).toUpperCase()}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {format(new Date(subscription.created_at), "MMM dd, yyyy 'at' h:mm a")}
            </span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Product Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {subscription.product?.image_url && (
              <img
                src={subscription.product.image_url}
                alt={subscription.product.name}
                className="w-24 h-24 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">{subscription.product?.name || "Product"}</h3>
              {subscription.variant && (
                <p className="text-sm text-muted-foreground mb-2">
                  {subscription.variant.weight}g • Quantity: {subscription.quantity}
                </p>
              )}
              {subscription.product?.description && (
                <p className="text-sm text-muted-foreground">{subscription.product.description}</p>
              )}
              {subscription.variant && (
                <p className="text-lg font-semibold mt-2">
                  ₹{subscription.variant.price.toFixed(2)} per delivery
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plan */}
      {subscription.plan && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Subscription Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan Name</span>
                <span className="font-medium">{subscription.plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium capitalize">{subscription.plan.frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Deliveries</span>
                <span className="font-medium">{subscription.total_deliveries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{subscription.completed_deliveries} / {subscription.total_deliveries}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Schedule */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Delivery Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Next Delivery Date</p>
              <p className="text-lg font-semibold text-primary">
                {deliveryDate}
              </p>
            </div>
            {subscription.preferred_delivery_date && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Preferred Delivery Day</p>
                <p className="font-medium">Day {subscription.preferred_delivery_date} of each month</p>
              </div>
            )}
            {subscription.next_billing_date && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Next Billing Date</p>
                <p className="font-medium">
                  {format(new Date(subscription.next_billing_date), "MMMM dd, yyyy")}
                </p>
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                💡 You can pause, skip, or modify delivery dates from your subscription dashboard anytime.
              </p>
            </div>
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
            <p className="font-medium">{subscription.shipping_address.fullName}</p>
            <p>{subscription.shipping_address.addressLine1}</p>
            {subscription.shipping_address.addressLine2 && (
              <p>{subscription.shipping_address.addressLine2}</p>
            )}
            <p>
              {subscription.shipping_address.city}, {subscription.shipping_address.state} -{" "}
              {subscription.shipping_address.pincode}
            </p>
            {subscription.shipping_address.landmark && (
              <p className="text-muted-foreground">
                Landmark: {subscription.shipping_address.landmark}
              </p>
            )}
            <p className="pt-2">
              <span className="text-muted-foreground">Phone:</span>{" "}
              {subscription.shipping_address.phone}
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
              <span className="text-muted-foreground">Price per Delivery</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantity</span>
              <span>{subscription.quantity}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Shipping</span>
              <span>FREE</span>
            </div>
            <div className="pt-2 border-t flex justify-between font-semibold">
              <span>Amount per Delivery</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * You'll be charged automatically before each delivery. No upfront payment required.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild variant="outline" size="lg">
          <Link to="/account/subscriptions">
            <Package className="w-4 h-4 mr-2" />
            Manage Subscription
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
      <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-300 border-2 shadow-lg mt-6">
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
  );
};

export default SubscriptionConfirmation;
