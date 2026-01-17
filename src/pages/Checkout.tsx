import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import Layout from "@/components/coffee/Layout";
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
  AlertCircle,
  Truck,
  RefreshCw,
} from "lucide-react";
import { shippingAddressSchema } from "@/lib/validation";
import { COD_ADVANCE_AMOUNT, COD_HANDLING_FEE } from "@/lib/shipping";
import logger from "@/lib/logger";
import DeliveryDatePicker from "@/components/subscription/DeliveryDatePicker";
import { addDays } from "date-fns";
import { PincodeDialog } from "@/components/PincodeDialog";

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

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
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
  };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
}

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

  const [step, setStep] = useState<CheckoutStep>("shipping");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>("prepaid");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    promotionId: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
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

  // Early return for empty cart - show message instead of redirecting
  if (cartItems.length === 0) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  // Early return if no shipping info - prompt to check delivery
  if (!shippingInfo) {
    return (
      <Layout>
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
      </Layout>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePincodeValidated = (pincode: string, shippingCharge: number, region: string) => {
    setShippingPincode(pincode);
    setShippingForm(prev => ({ ...prev, pincode }));
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

  const loadRazorpayScript = (): Promise<boolean> =>
    new Promise(resolve => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const prepareCheckoutData = () => {
    const subtotal = getCartTotal();
    const discount = appliedCoupon?.discount || 0;
    const shippingCharge = allItemsAreSubscription ? 0 : getShippingCharge();
    const codFee = paymentType === "cod" ? COD_HANDLING_FEE : 0;

    return {
      user_id: user?.id,
      subtotal,
      total_amount: subtotal - discount + shippingCharge + codFee,
      shipping_address: shippingForm,
      pincode: shippingForm.pincode,
      payment_type: paymentType,
      promotion_id: appliedCoupon?.promotionId || null,
      discount_amount: discount,
      items: cartItems.map(item => ({
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        is_subscription: item.is_subscription,
      })),
    };
  };

  const handlePlaceOrder = async () => {
    console.log("Place order clicked, orderId will be logged after payment");
    setIsLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Payment gateway failed to load");
      }

      const checkoutData = prepareCheckoutData();

      if (allItemsAreSubscription) {
        const firstItem = cartItems[0];
        const amount = Math.round(firstItem.product.price * 100);

        const { data: planData, error: planError } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("product_id", firstItem.product.id)
          .maybeSingle();

        if (planError || !planData) {
          throw new Error("Subscription plan not found");
        }

        const { data, error } = await supabase.functions.invoke(
          "create-razorpay-subscription",
          {
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
          }
        );

        if (error || !data) throw new Error("Unable to create subscription");

        window.location.href = data.shortUrl;
      } else {
        const amount =
          paymentType === "cod"
            ? COD_ADVANCE_AMOUNT
            : checkoutData.total_amount;

        const { data, error } = await supabase.functions.invoke(
          "create-razorpay-order",
          { body: { amount, checkoutData } }
        );

        if (error || !data) throw new Error("Unable to create order");

        const razorpay = new window.Razorpay({
          key: data.razorpayKeyId,
          amount: data.amount,
          currency: data.currency,
          name: "Sharma Coffee Works",
          description: "Order Payment",
          order_id: data.razorpayOrderId,
          handler: async (res: RazorpayResponse) => {
            const verify = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  ...res,
                  checkoutData,
                },
              }
            );

            if (!verify.data?.verified) {
              throw new Error("Payment verification failed");
            }

            console.log("Order created with ID:", verify.data.orderId);
            clearCart();
            navigate(`/order-confirmation/${verify.data.orderId}`);
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
      logger.error("Checkout failed", err);
      toast({
        title: "Payment Failed",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === "shipping") {
      if (!validateShipping()) return;
      if (allItemsAreSubscription) {
        setStep("delivery-date");
      } else {
        setStep("review");
      }
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
      if (allItemsAreSubscription) {
        setStep("delivery-date");
      } else {
        setStep("shipping");
      }
    } else if (step === "delivery-date") {
      setStep("shipping");
    }
  };

  // Memoize calculations to prevent re-computing on every render
  const calculatedPrices = useMemo(() => {
    const subtotal = getCartTotal();
    const discount = appliedCoupon?.discount || 0;
    const subtotalAfterDiscount = Math.max(0, subtotal - discount);

    // Check if all items are subscription (calculate inside useMemo)
    const hasSubscriptionItems = cartItems.some(i => i.is_subscription);
    const allItemsAreSubscription = cartItems.length > 0 && cartItems.every(i => i.is_subscription);

    // Calculate shipping - only if not all subscriptions and shippingInfo exists
    let shippingCharge = 0;
    if (!allItemsAreSubscription && shippingInfo) {
      shippingCharge = getShippingCharge();
    }

    const codFee = paymentType === "cod" ? COD_HANDLING_FEE : 0;
    const grandTotal = subtotalAfterDiscount + shippingCharge + codFee;
    const codBalance = paymentType === "cod" ? Math.max(0, grandTotal - COD_ADVANCE_AMOUNT) : 0;

    return {
      subtotal,
      discount,
      subtotalAfterDiscount,
      shippingCharge,
      codHandlingFee: codFee,
      grandTotal,
      codBalance,
      hasSubscriptionItems,
      allItemsAreSubscription,
    };
  }, [cartItems, appliedCoupon, shippingInfo, paymentType, getCartTotal, getShippingCharge]);

  const {
    subtotal,
    discount,
    shippingCharge,
    codFee,
    grandTotal,
    hasSubscriptionItems,
    allItemsAreSubscription,
  } = calculatedPrices;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
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
          <div className="lg:col-span-2 space-y-6">
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
                          onChange={handleInputChange}
                          required
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
                            Cash on Delivery (₹{COD_ADVANCE_AMOUNT} advance + ₹{COD_HANDLING_FEE}{" "}
                            handling)
                          </Label>
                        </div>
                      </RadioGroup>
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
                          {allItemsAreSubscription ? "Setup Subscription" : "Place Order"}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {cartItems.map((item) => (
                    <div
                      key={`${item.product.id}-${item.variant?.id}`}
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
                  {!allItemsAreSubscription && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>₹{shippingCharge.toFixed(2)}</span>
                    </div>
                  )}
                  {allItemsAreSubscription && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Shipping</span>
                      <span>FREE</span>
                    </div>
                  )}
                  {codFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">COD Fee</span>
                      <span>₹{codFee.toFixed(2)}</span>
                    </div>
                  )}
                </div>

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
    </Layout>
  );
};

export default Checkout;
