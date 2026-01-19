import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Check,
  Loader2,
  Package,
  MapPin,
  CreditCard,
  Truck,
} from "lucide-react";
import { shippingAddressSchema } from "@/lib/validation";
import { COD_ADVANCE_AMOUNT, COD_HANDLING_FEE } from "@/lib/shipping";
import DeliveryDatePicker from "@/components/subscription/DeliveryDatePicker";
import { addDays } from "date-fns";
import { PincodeDialog } from "@/components/PincodeDialog";

// ============================================
// TYPE DEFINITIONS
// ============================================

type CheckoutStep = "shipping" | "delivery-date" | "review" | "payment";
type PaymentType = "prepaid" | "cod";

interface ShippingForm {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
    backdropClose?: boolean;
  };
  readonly?: boolean;
  image?: string;
  config?: {
    display?: {
      blocks?: {
        banks?: {
          name?: string;
          instruments?: Array<{ type: string; issuers?: string[] }>;
        };
      };
    };
  };
  [key: string]: any;
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

// ============================================
// CHECKOUT COMPONENT
// ============================================

const Checkout = () => {
  const {
    cartItems,
    getCartTotal,
    clearCart,
    shippingInfo,
    setShippingPincode,
    getShippingCharge,
    isCodAvailable,
  } = useCart();

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalLog = console.log.bind(console);
    
    const shouldSuppressError = (message: unknown, ...args: unknown[]): boolean => {
      const messageStr = String(message);
      const fullMessage = [messageStr, ...args.map(String)].join(" ");
      
      return (
        messageStr.includes("localhost:7070") ||
        messageStr.includes("localhost:37857") ||
        messageStr.includes("localhost:7071") ||
        messageStr.includes("x-rtb-fingerprint-id") ||
        messageStr.includes("unsafe header") ||
        fullMessage.includes("x-rtb-fingerprint-id") ||
        fullMessage.includes("Refused to get unsafe header") ||
        (messageStr.includes("CORS") && (messageStr.includes("razorpay") || messageStr.includes("razorpay.com"))) ||
        (messageStr.includes("ERR_FAILED") && (messageStr.includes("razorpay") || messageStr.includes("razorpay.com"))) ||
        (messageStr.includes("Access to image") && (messageStr.includes("razorpay") || messageStr.includes("razorpay.com"))) ||
        (messageStr.includes("Refused to get") && (messageStr.includes("razorpay") || messageStr.includes("razorpay.com"))) ||
        (messageStr.includes("Refused to connect") && (messageStr.includes("razorpay") || messageStr.includes("razorpay.com")))
      );
    };

    console.error = ((message?: unknown, ...optionalParams: unknown[]) => {
      if (!shouldSuppressError(message, ...optionalParams)) {
        originalError(message, ...optionalParams);
      }
    }) as typeof console.error;

    console.warn = ((message?: unknown, ...optionalParams: unknown[]) => {
      if (!shouldSuppressError(message, ...optionalParams)) {
        originalWarn(message, ...optionalParams);
      }
    }) as typeof console.warn;

    console.log = ((message?: unknown, ...optionalParams: unknown[]) => {
      if (!shouldSuppressError(message, ...optionalParams)) {
        originalLog(message, ...optionalParams);
      }
    }) as typeof console.log;

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    };
  }, []);

  // ============================================
  // COMPUTED VALUES (MUST BE BEFORE ANY EARLY RETURNS)
  // ============================================
  
  const { hasSubscriptionItems, allItemsAreSubscription } = useMemo(() => {
    const hasSubs = cartItems.some((item) => item.is_subscription);
    const allSubs = cartItems.length > 0 && cartItems.every((item) => item.is_subscription);
    return { hasSubscriptionItems: hasSubs, allItemsAreSubscription: allSubs };
  }, [cartItems]);

  // ============================================
  // STATE
  // ============================================

  const [step, setStep] = useState<CheckoutStep>("shipping");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>("prepaid");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    promotionId: string;
  } | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<number>(15);
  const [showPincodeDialog, setShowPincodeDialog] = useState(false);

  const [shippingForm, setShippingForm] = useState<ShippingForm>({
    fullName: "",
    email: user?.email || "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: shippingInfo?.pincode || "",
    landmark: "",
  });

  // ============================================
  // PRICE CALCULATIONS (Memoized)
  // ============================================

  const calculatedPrices = useMemo(() => {
    const subtotal = getCartTotal();
    const discount = appliedCoupon?.discount || 0;
    const subtotalAfterDiscount = Math.max(0, subtotal - discount);

    let shippingCharge = 0;
    if (!allItemsAreSubscription && shippingInfo) {
      shippingCharge = getShippingCharge();
    }

    const codHandlingFee = paymentType === "cod" ? COD_HANDLING_FEE : 0;
    const grandTotal = subtotalAfterDiscount + shippingCharge + codHandlingFee;
    const codBalance = paymentType === "cod" ? Math.max(0, grandTotal - COD_ADVANCE_AMOUNT) : 0;

    return {
      subtotal,
      discount,
      subtotalAfterDiscount,
      shippingCharge,
      codHandlingFee,
      grandTotal,
      codBalance,
    };
  }, [cartItems, appliedCoupon, shippingInfo, paymentType, allItemsAreSubscription, getCartTotal, getShippingCharge]);

  const {
    subtotal,
    discount,
    shippingCharge,
    codHandlingFee,
    grandTotal,
    codBalance,
  } = calculatedPrices;

  // ============================================
  // EARLY RETURNS (After all hooks and memoized values)
  // ============================================

  if (cartItems.length === 0) {
    return (
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
              Your cart is empty
            </h1>
            <p className="text-muted-foreground mb-6">
              Add some products to your cart before checking out.
            </p>
            <Link to="/shop">
              <Button className="gap-2">
                Shop Now
                <Package className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
    );
  }

  if (!shippingInfo) {
    return (
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <MapPin className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
              Delivery location not set
            </h1>
            <p className="text-muted-foreground mb-6">
              Please check delivery availability before proceeding to checkout.
            </p>
            <Link to="/cart">
              <Button className="gap-2">
                Go to Cart
                <Truck className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
    );
  }

  // ============================================
  // HANDLERS
  // ============================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePincodeValidated = (pincode: string, shippingCharge: number, region: string) => {
    setShippingPincode(pincode);
    setShippingForm((prev) => ({ ...prev, pincode }));
    setShowPincodeDialog(false);
    toast({
      title: "Pincode Validated",
      description: `Delivery available to ${pincode} (${region})`,
    });
  };

  const validateShipping = (): boolean => {
    const result = shippingAddressSchema.safeParse(shippingForm);
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0]?.message ?? "Invalid address",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        console.log("[Razorpay] Script already loaded, Razorpay available");
        resolve(true);
        return;
      }

      const existingScripts = document.querySelectorAll('script[src*="razorpay.com"]');
      existingScripts.forEach((script) => {
        console.log("[Razorpay] Removing existing script:", script);
        script.remove();
      });

      console.log("[Razorpay] Loading Razorpay checkout script...");
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      
      script.onload = () => {
        console.log("[Razorpay] Script loaded successfully");
        setTimeout(() => {
          if (window.Razorpay) {
            console.log("[Razorpay] Razorpay instance confirmed available after delay");
            resolve(true);
          } else {
            console.error("[Razorpay] Script loaded but window.Razorpay is not available");
            resolve(false);
          }
        }, 100);
      };
      
      script.onerror = (error) => {
        console.error("[Razorpay] Failed to load script:", error);
        resolve(false);
      };
      
      document.body.appendChild(script);
    });
  };

  const prepareCheckoutData = () => {
    return {
      user_id: user?.id,
      subtotal,
      total_amount: grandTotal,
      shipping_address: shippingForm,
      pincode: shippingForm.pincode,
      shipping_region: shippingInfo?.region || "rest_of_india",
      shipping_charge: shippingCharge,
      payment_type: paymentType,
      cod_advance_paid: paymentType === "cod" ? COD_ADVANCE_AMOUNT : 0,
      cod_handling_fee: paymentType === "cod" ? COD_HANDLING_FEE : 0,
      cod_balance: paymentType === "cod" ? codBalance : 0,
      promotion_id: appliedCoupon?.promotionId || null,
      discount_amount: discount,
      items: cartItems.map((item) => ({
        product_name: item.product.name,
        product_id: item.product.id,
        weight: item.weight,
        grind_type: item.variant?.grind_type || "Whole Bean",
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity,
        variant_id: item.variant?.id || null,
        is_subscription: item.is_subscription || false,
      })),
    };
  };

  const handlePlaceOrder = async () => {
    console.log("Place order clicked");
    setIsLoading(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Payment gateway failed to load. Please refresh and try again.");
      }

      const checkoutData = prepareCheckoutData();
      console.log("Checkout data prepared:", checkoutData);

      if (allItemsAreSubscription) {
        await handleSubscriptionOrder(checkoutData);
        return;
      }

      await handleRegularOrder(checkoutData);

    } catch (err) {
      console.error("Checkout failed:", err);
      toast({
        title: "Payment Failed",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleSubscriptionOrder = async (checkoutData: ReturnType<typeof prepareCheckoutData>) => {
    const firstItem = cartItems[0];
    const amount = Math.round(firstItem.product.price * 100);

    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("product_id", firstItem.product.id)
      .maybeSingle();

    if (planError || !planData) {
      throw new Error("Subscription plan not found for this product");
    }

    const { data, error } = await supabase.functions.invoke("create-razorpay-subscription", {
      body: {
        planId: planData.id,
        productId: firstItem.product.id,
        variantId: firstItem.variant?.id,
        quantity: firstItem.quantity,
        preferredDeliveryDate: deliveryDate,
        totalDeliveries: 12,
        shippingAddress: shippingForm,
        amount,
      },
    });

    if (error || !data) {
      throw new Error("Unable to create subscription. Please try again.");
    }

    window.location.href = data.shortUrl;
  };

  const handleRegularOrder = async (checkoutData: ReturnType<typeof prepareCheckoutData>) => {
    const amount = paymentType === "cod" ? COD_ADVANCE_AMOUNT : grandTotal;
    console.log("[Razorpay] Creating order for amount:", amount);

    try {
      // Create Razorpay order
      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount,
          isPartialCod: paymentType === "cod",
          checkoutData: JSON.stringify(checkoutData),
        },
      });

      if (error) {
        console.error("Create order error:", error);
        throw new Error("Unable to create payment order. Please try again.");
      }

      if (!data || !data.razorpayOrderId) {
        console.error("Invalid response:", data);
        throw new Error("Invalid response from payment gateway.");
      }

      console.log("[Razorpay] Order created:", data.razorpayOrderId);

      // Use payment link (redirects to Razorpay) instead of modal
      if (data.shortUrl) {
        console.log("[Razorpay] Redirecting to payment link:", data.shortUrl);
        window.location.href = data.shortUrl;
      } else {
        // Fallback to modal if shortUrl not available
        const razorpay = new window.Razorpay({
          key: data.razorpayKeyId,
          amount: data.amount,
          currency: "INR",
          name: "Sharma Coffee Works",
          description: paymentType === "cod" ? "COD Advance Payment" : "Order Payment",
          order_id: data.razorpayOrderId,
          handler: async (response: RazorpayResponse) => {
            console.log("Payment successful:", response);
            await verifyPaymentAndCreateOrder(response, checkoutData);
          },
          prefill: {
            name: shippingForm.fullName,
            email: shippingForm.email,
            contact: shippingForm.phone,
          },
          theme: { color: "#C8A97E" },
        });
        razorpay.open();
      }
    } catch (err) {
      console.error("Checkout failed:", err);
      toast({
        title: "Payment Failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const verifyPaymentAndCreateOrder = async (
    razorpayResponse: RazorpayResponse,
    checkoutData: ReturnType<typeof prepareCheckoutData>
  ) => {
    try {
      console.log("Verifying payment with backend...");

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "verify-razorpay-payment",
        {
          body: {
            razorpayOrderId: razorpayResponse.razorpay_order_id,
            razorpayPaymentId: razorpayResponse.razorpay_payment_id,
            razorpaySignature: razorpayResponse.razorpay_signature,
            checkoutData: JSON.stringify(checkoutData),
          },
        }
      );

      if (verifyError) {
        console.error("Verification error:", verifyError);
        throw new Error("Payment verification failed. Please contact support.");
      }

      if (!verifyData?.verified) {
        console.error("Payment not verified:", verifyData);
        throw new Error(verifyData?.error || "Payment verification failed.");
      }

      console.log("Order created successfully:", verifyData.orderId);

      clearCart();
      
      toast({
        title: "Order Placed Successfully!",
        description: `Order #${verifyData.orderNumber || verifyData.orderId} has been confirmed.`,
      });

      navigate(`/order-confirmation/${verifyData.orderId}`);

    } catch (err) {
      console.error("Order creation failed:", err);
      toast({
        title: "Order Failed",
        description: err instanceof Error ? err.message : "Failed to create order. Please contact support.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === "shipping") {
      if (!validateShipping()) return;
      setStep(allItemsAreSubscription ? "delivery-date" : "review");
    } else if (step === "delivery-date") {
      setStep("review");
    } else if (step === "review") {
      setStep("payment");
    }
  };

  const handlePrevStep = () => {
    if (step === "payment") {
      setStep("review");
    } else if (step === "review") {
      setStep(allItemsAreSubscription ? "delivery-date" : "shipping");
    } else if (step === "delivery-date") {
      setStep("shipping");
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <div className="flex items-center gap-2 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/cart")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* STEP 1: Shipping */}
            {step === "shipping" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={shippingForm.fullName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={shippingForm.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={shippingForm.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      name="addressLine1"
                      value={shippingForm.addressLine1}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      name="addressLine2"
                      value={shippingForm.addressLine2}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={shippingForm.city}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={shippingForm.state}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="pincode"
                          name="pincode"
                          value={shippingForm.pincode}
                          readOnly
                          className="cursor-pointer"
                          onClick={() => setShowPincodeDialog(true)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPincodeDialog(true)}
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          Check
                        </Button>
                      </div>
                      {shippingInfo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Truck className="w-3 h-3 inline mr-1" />
                          Delivering to {shippingInfo.region} - ₹{getShippingCharge()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="landmark">Landmark</Label>
                    <Input
                      id="landmark"
                      name="landmark"
                      value={shippingForm.landmark}
                      onChange={handleInputChange}
                    />
                  </div>

                  <Button onClick={handleNextStep} className="w-full">
                    Continue to {allItemsAreSubscription ? "Delivery Date" : "Review"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* STEP 2: Delivery Date (Subscriptions only) */}
            {step === "delivery-date" && allItemsAreSubscription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Select Delivery Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DeliveryDatePicker
                    selectedDate={deliveryDate}
                    onDateChange={setDeliveryDate}
                    minDate={addDays(new Date(), 3)}
                  />

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleNextStep} className="flex-1">
                      Continue to Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 3: Review */}
            {step === "review" && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Shipping Address</h3>
                    <div className="text-sm text-muted-foreground">
                      <p>{shippingForm.fullName}</p>
                      <p>{shippingForm.addressLine1}</p>
                      {shippingForm.addressLine2 && <p>{shippingForm.addressLine2}</p>}
                      <p>
                        {shippingForm.city}, {shippingForm.state} - {shippingForm.pincode}
                      </p>
                      <p>{shippingForm.phone}</p>
                    </div>
                  </div>

                  {allItemsAreSubscription && (
                    <div>
                      <h3 className="font-semibold mb-2">Delivery Schedule</h3>
                      <p className="text-sm text-muted-foreground">
                        Monthly delivery on the {deliveryDate}
                        {deliveryDate === 1 ? "st" : deliveryDate === 2 ? "nd" : deliveryDate === 3 ? "rd" : "th"} of
                        each month
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleNextStep} className="flex-1">
                      Continue to Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 4: Payment */}
            {step === "payment" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {allItemsAreSubscription && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h3 className="font-medium flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4" />
                        Auto-Payment Setup
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        You'll authorize automatic monthly payments through Razorpay. You can
                        cancel anytime from your account.
                      </p>
                      <ul className="text-xs space-y-1">
                        <li className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-600" />
                          Secure bank authorization
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-600" />
                          Cancel anytime
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-600" />
                          Get notified before each charge
                        </li>
                      </ul>
                    </div>
                  )}

                  {!allItemsAreSubscription && isCodAvailable() && (
                    <div>
                      <Label>Payment Method</Label>
                      <RadioGroup
                        value={paymentType}
                        onValueChange={(value) => setPaymentType(value as PaymentType)}
                        className="mt-2 space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="prepaid" id="prepaid" />
                          <Label htmlFor="prepaid" className="cursor-pointer">
                            Pay Online (UPI, Card, Net Banking)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cod" id="cod" />
                          <Label htmlFor="cod" className="cursor-pointer">
                            Cash on Delivery (₹{COD_ADVANCE_AMOUNT} advance + ₹{COD_HANDLING_FEE} handling)
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {paymentType === "cod" && !allItemsAreSubscription && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                      <p className="font-medium mb-2">COD Payment Details:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Pay ₹{COD_ADVANCE_AMOUNT} now to confirm your order</li>
                        <li>• Pay remaining ₹{codBalance.toFixed(2)} on delivery</li>
                        <li>• COD handling fee: ₹{COD_HANDLING_FEE}</li>
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handlePrevStep} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {allItemsAreSubscription 
                            ? "Setup Subscription" 
                            : paymentType === "cod"
                              ? `Pay ₹${COD_ADVANCE_AMOUNT} & Place Order`
                              : `Pay ₹${grandTotal.toFixed(2)} & Place Order`
                          }
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div
                      key={`${item.product.id}-${item.variant?.id}-${item.is_subscription}`}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.product.name} x{item.quantity}
                        {item.is_subscription && (
                          <span className="text-primary ml-1">(Subscription)</span>
                        )}
                      </span>
                      <span>₹{(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {!allItemsAreSubscription ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>₹{shippingCharge.toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Shipping</span>
                      <span>FREE</span>
                    </div>
                  )}
                  
                  {codHandlingFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">COD Handling Fee</span>
                      <span>₹{codHandlingFee.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Grand Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                  
                  {allItemsAreSubscription && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Billed monthly for 12 deliveries
                    </p>
                  )}
                  
                  {paymentType === "cod" && !allItemsAreSubscription && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Pay now: ₹{COD_ADVANCE_AMOUNT}</p>
                      <p>Pay on delivery: ₹{codBalance.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pincode Dialog */}
        <PincodeDialog
          open={showPincodeDialog}
          onOpenChange={setShowPincodeDialog}
          onPincodeValidated={handlePincodeValidated}
          currentPincode={shippingInfo?.pincode}
        />
      </div>
  );
};

export default Checkout;