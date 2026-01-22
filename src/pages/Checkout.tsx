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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Loader2,
  Package,
  MapPin,
  CreditCard,
  Truck,
  Home,
  ExternalLink,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { shippingAddressSchema } from "@/lib/validation";
import { COD_ADVANCE_AMOUNT, COD_HANDLING_FEE, lookupPincodeDetails, getShippingRegion, getShippingRegionLabel, getShippingCharge } from "@/lib/shipping";
import DeliveryDatePicker from "@/components/subscription/DeliveryDatePicker";
import { addDays, format } from "date-fns";
import { PincodeDialog } from "@/components/PincodeDialog";
import { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ============================================
// TYPE DEFINITIONS
// ============================================

type CheckoutStep = "shipping" | "delivery-date" | "review" | "payment";
type PaymentType = "prepaid" | "cod";
type SavedAddress = Tables<'customer_addresses'>;

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
  // For one-time payments
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  // For one-time payments
  order_id?: string;
  // For subscriptions
  subscription_id?: string;
  handler?: (response: RazorpayResponse) => void;
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
  // COMPUTED VALUES
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
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

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

  // Fetch saved addresses when user is logged in
  useEffect(() => {
    if (user) {
      fetchSavedAddresses();
    }
  }, [user]);

  // Auto-select default address if available
  useEffect(() => {
    if (savedAddresses.length > 0) {
      const defaultAddress = savedAddresses.find(addr => addr.is_default);
      if (defaultAddress) {
        handleSelectSavedAddress(defaultAddress.id);
      }
    }
  }, [savedAddresses]);

  const fetchSavedAddresses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedAddresses(data || []);
    } catch (error) {
      console.error('Error fetching saved addresses:', error);
    }
  };

  const handleSelectSavedAddress = (addressId: string) => {
    if (addressId === "new") {
      // Reset form for new address
      setShippingForm({
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
      setSelectedAddressId("new");
      return;
    }

    const address = savedAddresses.find(addr => addr.id === addressId);
    if (!address) return;

    setSelectedAddressId(addressId);
    setShippingForm({
      fullName: address.full_name,
      email: user?.email || "",
      phone: address.phone,
      addressLine1: address.address_line1,
      addressLine2: address.address_line2 || "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark || "",
    });

    // Update shipping pincode if different (this will trigger shipping charge recalculation)
    if (address.pincode !== shippingInfo?.pincode) {
      const region = getShippingRegion(address.pincode);
      if (region) {
        const charge = getShippingCharge(address.pincode);
        const regionLabel = getShippingRegionLabel(region);
        handlePincodeValidated(address.pincode, charge, regionLabel);
      }
    }
  };

  // Auto-fill city and state when pincode changes
  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pincode = e.target.value.replace(/\D/g, '').slice(0, 6);
    setShippingForm((prev) => ({ ...prev, pincode }));

    // If user manually changes pincode, clear saved address selection
    if (selectedAddressId !== "new") {
      setSelectedAddressId("new");
    }

    // Lookup city and state when pincode is complete
    if (pincode.length === 6) {
      setIsLookingUpPincode(true);
      try {
        const details = await lookupPincodeDetails(pincode);
        if (details) {
          setShippingForm((prev) => ({
            ...prev,
            city: details.city || prev.city,
            state: details.state || prev.state,
          }));
        }
      } catch (error) {
        console.error('Error looking up pincode:', error);
      } finally {
        setIsLookingUpPincode(false);
      }
    }
  };

  // ============================================
  // PRICE CALCULATIONS
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
    // For COD: Customer pays ₹150 upfront (₹100 advance + ₹50 handling fee)
    const codUpfrontAmount = COD_ADVANCE_AMOUNT + COD_HANDLING_FEE; // ₹150
    const codBalance = paymentType === "cod" ? Math.max(0, grandTotal - codUpfrontAmount) : 0;

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
  // EARLY RETURNS
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
    
    // Special handling for pincode to auto-fill city/state
    if (name === "pincode") {
      handlePincodeChange(e);
      return;
    }
    
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
      cod_advance_paid: paymentType === "cod" ? COD_ADVANCE_AMOUNT : 0, // Still store as ₹100 for record keeping
      cod_handling_fee: paymentType === "cod" ? COD_HANDLING_FEE : 0,
      cod_balance: paymentType === "cod" ? codBalance : 0,
      cod_upfront_amount: paymentType === "cod" ? (COD_ADVANCE_AMOUNT + COD_HANDLING_FEE) : 0, // ₹150 total upfront
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

  // ✅ DYNAMIC VARIANT PRICING - ONE PLAN PER PRODUCT
  // NOTE: If you see 400 errors from "lumberjack.razorpay.com" in the console,
  // these are Razorpay's analytics tracking errors and are non-critical.
  // The subscription creation will still work if you see "Subscription created successfully" log.
  const handleSubscriptionOrder = async (checkoutData: ReturnType<typeof prepareCheckoutData>) => {
    try {
      console.log("🚀 Starting subscription order...");
      
      // ✅ DEBUG: Log cart items for troubleshooting
      console.log("=== CART ITEMS DEBUG ===");
      cartItems.forEach((item, index) => {
        console.log(`Cart Item ${index}:`, {
          product_name: item.product?.name,
          product_id: item.product?.id,
          product_price: item.product?.price,
          variant_id: item.variant_id,
          variant: item.variant,
          original_price: item.original_price,
          is_subscription: item.is_subscription,
          quantity: item.quantity,
        });
      });
      console.log("=== END CART DEBUG ===");

      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.access_token) {
        console.error("No session or access token");
        throw new Error("You must be logged in to subscribe.");
      }

      console.log("Session token available: true");

      const firstItem = cartItems[0];
      if (!firstItem) {
        throw new Error("Cart is empty");
      }

      const product = firstItem.product;
      
      // ✅ GET SELECTED VARIANT FROM CART
      const variantId = firstItem.variant_id;
      
      if (!variantId) {
        throw new Error("No product variant selected. Please select a variant size.");
      }

      // ✅ FETCH VARIANT TO GET PLAN ID AND PRICE
      // The Edge Function uses variant.razorpay_plan_id, so we must check that first
      console.log("Fetching variant details from database...");
      const { data: variantData, error: variantError } = await supabase
        .from("product_variants")
        .select("id, price, weight, razorpay_plan_id")
        .eq("id", variantId)
        .single();

      if (variantError || !variantData) {
        console.error("Variant fetch error:", variantError);
        throw new Error("Variant not found. Please select a valid product variant.");
      }

      // ✅ CHECK PLAN ID - Priority: variant > product
      const planId = variantData.razorpay_plan_id || product.razorpay_plan_id;
      
      console.log("Plan ID check:", {
        variant_plan_id: variantData.razorpay_plan_id,
        product_plan_id: product.razorpay_plan_id,
        final_plan_id: planId,
      });

      if (!planId) {
        throw new Error(
          `Subscription plan not configured for "${product.name}". ` +
          `This product is currently unavailable for subscription. ` +
          `Please try one-time purchase instead.`
        );
      }

      // ✅ GET VARIANT PRICE - Use original_price from cart or fetched price
      let variantPrice: number;
      
      if (firstItem.original_price && firstItem.original_price > 0) {
        // Use stored variant price from cart
        variantPrice = firstItem.original_price;
        console.log("✅ Using variant price from cart (₹):", variantPrice);
        console.log("   Type:", typeof variantPrice);
        console.log("   Value:", variantPrice);
      } else {
        variantPrice = Number(variantData.price); // Ensure it's a number
        console.log("✅ Fetched variant price from database:", {
          variant_id: variantData.id,
          sku: variantData.sku,
          weight: variantData.weight,
          price_raw: variantData.price,
          price_number: variantPrice,
          price_type: typeof variantPrice,
        });
      }

      // ✅ VALIDATE VARIANT PRICE
      if (!variantPrice || variantPrice <= 0 || isNaN(variantPrice)) {
        console.error("❌ Invalid variant price:", {
          price: variantPrice,
          type: typeof variantPrice,
          isNaN: isNaN(variantPrice),
        });
        throw new Error("Invalid price for selected variant. Please select a valid product variant.");
      }
      
      // ✅ VALIDATE VARIANT PRICE IS REASONABLE (not too low)
      if (variantPrice < 1) {
        console.error("❌ Variant price is too low:", variantPrice);
        console.error("   This might indicate a data issue. Expected price should be at least ₹1.");
        throw new Error(`Variant price (₹${variantPrice}) seems incorrect. Please verify the product pricing.`);
      }
      
      // ✅ WARN if price seems unusually low (might be in wrong unit)
      if (variantPrice < 10) {
        console.warn("⚠️ WARNING: Variant price is very low:", variantPrice);
        console.warn("   If this should be ₹50, check if price is stored correctly in database.");
        console.warn("   Price might be in wrong unit (paise instead of rupees, or vice versa).");
      }

      // ✅ CONVERT TO PAISE FOR RAZORPAY (multiply by 100)
      // Variant price is in RUPEES (e.g., 50), convert to PAISE (e.g., 5000)
      console.log("🔢 AMOUNT CALCULATION:");
      console.log("   Variant Price (raw):", variantPrice);
      console.log("   Variant Price type:", typeof variantPrice);
      console.log("   Calculation: variantPrice * 100 =", variantPrice, "* 100 =", variantPrice * 100);
      
      const amountInPaise = Math.round(variantPrice * 100);
      
      console.log("   Amount in Paise (rounded):", amountInPaise);
      console.log("   Amount in ₹ (verify):", amountInPaise / 100);
      
      // ✅ CRITICAL VALIDATION: Ensure amount is correct
      if (amountInPaise !== variantPrice * 100) {
        console.warn("⚠️ WARNING: Amount was rounded! Original:", variantPrice * 100, "Rounded:", amountInPaise);
      }
      console.log('🔍 DEBUG CART ITEM:', {
        product_name: firstItem.product?.name,
        product_price: firstItem.product?.price,
        original_price: firstItem.original_price,
        variant_id: firstItem.variant_id,
        variant: firstItem.variant,
        type_of_original_price: typeof firstItem.original_price,
        is_subscription: firstItem.is_subscription
      });
      if (amountInPaise < 100) {
        console.error("❌ ERROR: Amount is less than 100 paise (₹1)!");
        console.error("   This suggests variantPrice might be wrong:", variantPrice);
        throw new Error(`Invalid variant price: ₹${variantPrice}. Price must be at least ₹1.`);
      }

      console.log("💰 VARIANT PRICING DETAILS:");
      console.log("   Variant ID:", variantId);
      console.log("   Variant Price (₹):", variantPrice);
      console.log("   Amount in Paise:", amountInPaise);
      console.log("   Amount in ₹ (verify):", amountInPaise / 100);
      console.log("   Plan ID:", planId);
      console.log("   Product ID:", product.id);
      console.log("   Quantity:", firstItem.quantity);
      
      // ✅ FINAL CHECK: Verify the amount makes sense
      if (amountInPaise / 100 !== variantPrice) {
        console.error("❌ CRITICAL: Amount conversion mismatch!");
        console.error("   Expected: ₹" + variantPrice);
        console.error("   Calculated: ₹" + (amountInPaise / 100));
        throw new Error(`Amount calculation error. Expected ₹${variantPrice}, got ₹${amountInPaise / 100}`);
      }

      console.log("Calling Edge Function...");
      
      // Get fresh session (matches pattern used by dtdc-create-consignment)
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error("Session error:", sessionError);
        throw new Error("No valid session. Please log in again.");
      }

      // Build request body to match Edge Function schema exactly
      const requestData = {
        user_id: freshSession.user.id,
        access_token: freshSession.access_token,
        product_id: product.id,
        variant_id: variantId,
        quantity: firstItem.quantity,
        preferred_delivery_date: deliveryDate,
        total_deliveries: 12,
        shipping_address: shippingForm,
      };

      console.log("📤 REQUEST DATA TO EDGE FUNCTION (create-razorpay-subscription):");
      console.log("   User ID:", requestData.user_id);
      console.log("   Product ID:", requestData.product_id);
      console.log("   Variant ID:", requestData.variant_id);
      console.log("   Quantity:", requestData.quantity);
      console.log("   Preferred Delivery Date:", requestData.preferred_delivery_date);
      console.log("   Total Deliveries:", requestData.total_deliveries);
      
      console.log("Auth token check:", {
        hasSession: !!freshSession,
        hasAccessToken: !!freshSession?.access_token,
        tokenLength: freshSession?.access_token?.length || 0,
        tokenPrefix: freshSession?.access_token?.substring(0, 20) || "none",
      });

      // Use direct fetch with anon key to bypass gateway JWT validation
      // Then pass user token in body for server-side verification
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log("Calling Edge Function with anon key authentication...");
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/create-razorpay-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`, // Use anon key for gateway auth
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Unable to create subscription";
        let errorDetails = "";
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
          errorDetails = errorJson.details || errorJson.missingFields?.join(", ") || "";
          
          // Check for Razorpay-specific errors
          if (errorJson.razorpayError) {
            const rzError = errorJson.razorpayError;
            const rzDescription = rzError.description || rzError.message || "";
            const rzField = rzError.field || "";
            const rzCode = rzError.code || "";
            
            console.error("❌ RAZORPAY ERROR:", {
              code: rzCode,
              field: rzField,
              description: rzDescription,
              fullError: rzError,
            });
            
            // Build user-friendly error message
            if (rzField) {
              errorDetails = `Razorpay Error: ${rzField} - ${rzDescription}`;
            } else if (rzDescription) {
              errorDetails = `Razorpay Error: ${rzDescription}`;
            } else {
              errorDetails = "Razorpay payment gateway error. Please check the plan configuration.";
            }
          }
          
          // Log full error details for debugging
          console.error("❌ Edge Function Error Details:", {
            status: response.status,
            error: errorMessage,
            details: errorDetails,
            missingFields: errorJson.missingFields,
            razorpayError: errorJson.razorpayError,
            fullError: errorJson,
          });
        } catch {
          errorMessage = errorText || errorMessage;
          console.error("❌ Edge Function Error (non-JSON):", {
            status: response.status,
            errorText: errorText,
          });
        }
        
        // Show detailed error message to user
        const finalErrorMessage = errorDetails 
          ? `${errorMessage}: ${errorDetails}`
          : errorMessage;
        
        throw new Error(finalErrorMessage);
      }

      const result = await response.json();
      console.log("✅ Subscription created successfully:", result);
      console.log("   Razorpay Subscription ID:", result.razorpay_subscription_id);
      console.log("   Short URL:", result.short_url);

      if (!result) {
        throw new Error("No response from subscription service");
      }

      const razorpayKeyId = result.razorpay_key_id as string | undefined;
      const razorpaySubscriptionId = result.razorpay_subscription_id as string | undefined;

      if (!razorpayKeyId || !razorpaySubscriptionId) {
        console.error("❌ Missing key or subscription_id in response:", {
          razorpayKeyId,
          razorpaySubscriptionId,
        });
        throw new Error("Subscription created but payment information is incomplete. Please contact support.");
      }

      // ✅ OPEN RAZORPAY CHECKOUT USING ONLY SUBSCRIPTION_ID (no amount/order/plan fields)
      if (!window.Razorpay) {
        console.error("❌ Razorpay SDK not available when opening subscription checkout");
        throw new Error("Payment gateway is not available. Please refresh and try again.");
      }

      // Ensure the page layout cannot clip or hide the Razorpay overlay.
      // We explicitly reset body styles here so the modal can render on top.
      document.body.style.overflow = "visible";
      document.body.style.position = "static";
      document.body.setAttribute("data-razorpay-open", "true");

      // Store subscription ID in a variable accessible to the handler
      const subscriptionIdForConfirmation = razorpaySubscriptionId;
      
      const subscriptionCheckoutOptions: RazorpayOptions = {
        key: razorpayKeyId,
        subscription_id: razorpaySubscriptionId,
        name: "Sharma Coffee Works",
        description: product.name || "Coffee Subscription",
        // For subscriptions, Razorpay handles billing only. We use handler
        // to notify the user and redirect to subscriptions page.
        handler: async (response: any) => {
          console.log("✅ Subscription payment successful:", response);
          
          // Clear the cart since subscription is activated
          clearCart();
          
          // Show success message
          toast({
            title: "Subscription Activated! 🎉",
            description:
              "Your subscription is now active. Redirecting to confirmation page...",
          });
          
          // Navigate to subscription confirmation page
          // Use razorpay_subscription_id from the response or the one we created
          const subscriptionId = response.subscription_id || subscriptionIdForConfirmation;
          
          if (subscriptionId) {
            // Navigate to confirmation page with subscription ID
            setTimeout(() => {
              navigate(`/subscription-confirmation/${subscriptionId}`, { replace: true });
            }, 1000);
          } else {
            // Fallback to subscriptions page if ID not available
            setTimeout(() => {
              navigate("/account/subscriptions", { replace: true });
            }, 1500);
          }
        },
        prefill: {
          name: shippingForm.fullName || "",
          email: shippingForm.email || "",
          contact: shippingForm.phone || "",
        },
        theme: {
          color: "#C8A97E",
        },
        modal: {
          ondismiss: () => {
            console.log("[Razorpay] Subscription payment popup dismissed by user");
            setIsLoading(false);
            toast({
              title: "Payment Cancelled",
              description: "Subscription setup was cancelled. You can try again anytime.",
              variant: "default",
            });
          },
        },
      };

      console.log("🧾 Opening Razorpay subscription checkout with options:", subscriptionCheckoutOptions);

      const razorpay = new window.Razorpay(subscriptionCheckoutOptions);
      razorpay.open();

    } catch (error) {
      console.error("Subscription error:", error);
      throw error;
    }
  };

  const handleRegularOrder = async (checkoutData: ReturnType<typeof prepareCheckoutData>) => {
    // ONE-TIME PAYMENTS (NON-SUBSCRIPTION)
    // ------------------------------------
    // For regular orders we MUST use the backend-created Razorpay order_id
    // and open Checkout with `order_id` only. This ensures the popup is
    // reliable on modern Razorpay and avoids creating any internal order
    // before payment is actually completed.
    try {
      // For COD: Charge ₹150 upfront (₹100 advance + ₹50 handling fee)
      const amountRupees = paymentType === "cod" ? (COD_ADVANCE_AMOUNT + COD_HANDLING_FEE) : grandTotal;
      console.log("[Razorpay] Creating one-time order for amount (₹):", amountRupees);

      // Add timeout wrapper to prevent infinite hanging
      const invokeWithTimeout = (timeoutMs: number) => {
        return Promise.race([
          supabase.functions.invoke("create-razorpay-order", {
            body: {
              amount: amountRupees,
            },
          }),
          new Promise<{ data: null; error: { message: string } }>((_, reject) =>
            setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
          ),
        ]);
      };

      console.log("[Razorpay] Calling create-razorpay-order edge function...");
      const { data, error } = await invokeWithTimeout(30000); // 30 second timeout

      console.log("[Razorpay] Edge function response received:", { data, error });

      if (error) {
        console.error("[Razorpay] Create Razorpay order error:", error);
        throw new Error(
          error.message || "Unable to create payment order. Please try again."
        );
      }

      if (!data) {
        console.error("[Razorpay] No data in response");
        throw new Error("No response from payment gateway. Please try again.");
      }

      const razorpayOrderId =
        data?.razorpayOrderId || data?.order_id || data?.orderId;
      const razorpayKeyId =
        data?.razorpayKeyId || data?.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;

      console.log("[Razorpay] Extracted values:", { razorpayOrderId, razorpayKeyId });

      if (!razorpayOrderId || !razorpayKeyId) {
        console.error("[Razorpay] Invalid create-razorpay-order response:", data);
        throw new Error("Invalid response from payment gateway. Please try again.");
      }

      if (!window.Razorpay) {
        throw new Error("Payment gateway failed to load. Please refresh and try again.");
      }

      // Ensure the popup is not visually blocked by SPA layout/scroll styles.
      // Remove any styles that might hide or clip the Razorpay modal
      document.body.style.overflow = "visible";
      document.documentElement.style.overflow = "visible";
      document.body.style.position = "static";
      document.documentElement.style.position = "static";
      
      // Check for any parent containers that might be clipping/hiding content
      const checkoutContainer = document.querySelector('.container, [class*="checkout"], main, #root');
      if (checkoutContainer) {
        const containerStyle = window.getComputedStyle(checkoutContainer as Element);
        if (containerStyle.overflow === 'hidden' || containerStyle.overflowY === 'hidden') {
          console.warn("[Razorpay] ⚠️ Parent container has overflow:hidden, this may hide the popup");
        }
      }

      const options = {
        key: razorpayKeyId,
        order_id: razorpayOrderId, // ✅ Use backend-generated order_id only
        name: "Sharma Coffee Works",
        description: paymentType === "cod" ? "COD Advance Payment" : "Order Payment",
        handler: async (response: RazorpayResponse) => {
          console.log("[Razorpay] One-time payment successful:", response);
          await verifyPaymentAndCreateOrder(response, checkoutData);
        },
        prefill: {
          name: shippingForm.fullName || "",
          email: shippingForm.email || "",
          contact: shippingForm.phone || "",
        },
        theme: { color: "#C8A97E" },
        modal: {
          ondismiss: () => {
            console.log("[Razorpay] One-time payment popup dismissed by user");
            // No order is created when popup is dismissed.
            setIsLoading(false);
          },
        },
      };

      console.log("[Razorpay] Opening checkout with order_id:", razorpayOrderId);

      const razorpay = new window.Razorpay(options);

      // Small delay before opening to avoid any SPA/layout timing issues
      // and ensure the popup is treated as a user-initiated gesture.
      setTimeout(() => {
        razorpay.open();

        // Ensure Razorpay modal is visible after opening (fixes SPA layout issues)
        setTimeout(() => {
          const razorpayModal = document.querySelector('.razorpay-container') ||
                               document.querySelector('[class*="razorpay"]') ||
                               document.querySelector('iframe[src*="razorpay"]') || 
                               document.querySelector('#razorpay-checkout-frame') ||
                               document.querySelector('[id*="razorpay"]');
          
          if (razorpayModal) {
            const modalEl = razorpayModal as HTMLElement;
            
            // Force visibility with inline styles to override any CSS that might hide it
            modalEl.style.cssText += `
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              z-index: 999999 !important;
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              max-height: 100vh !important;
              pointer-events: auto !important;
            `;

            // Check and fix parent elements that might be hiding the modal
            let parent = modalEl.parentElement;
            let parentLevel = 0;
            while (parent && parentLevel < 5) {
              const parentStyle = window.getComputedStyle(parent);
              if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden' || parentStyle.opacity === '0') {
                parent.style.cssText += `
                  display: block !important;
                  visibility: visible !important;
                  opacity: 1 !important;
                `;
              }
              parent = parent.parentElement;
              parentLevel++;
            }

            // Ensure body/html don't block the modal
            document.body.style.cssText += 'overflow: visible !important; position: static !important;';
            document.documentElement.style.cssText += 'overflow: visible !important; position: static !important;';

            // Ensure iframe inside modal is visible
            const iframe = modalEl.querySelector('iframe');
            if (iframe) {
              (iframe as HTMLElement).style.cssText += `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                width: 100% !important;
                height: 100% !important;
              `;
            }
          }
        }, 500);
      }, 100);
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

  const verifyPaymentAndCreateOrder = async (
    razorpayResponse: RazorpayResponse,
    checkoutData: ReturnType<typeof prepareCheckoutData>
  ) => {
    try {
      console.log("Verifying payment with backend...");

      // Ensure we have a valid session before calling the function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          throw new Error("Session expired. Please log in again.");
        }
      }

      // Use direct fetch to avoid CORS issues with supabase.functions.invoke()
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      
      // Use direct fetch with proper Supabase Edge Function headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      };
      
      // Add Authorization header if user is logged in
      if (currentSession?.access_token) {
        headers["Authorization"] = `Bearer ${currentSession.access_token}`;
      }
      
      console.log("Calling verify-razorpay-payment via direct fetch...");
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-razorpay-payment`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          razorpayOrderId: razorpayResponse.razorpay_order_id,
          razorpayPaymentId: razorpayResponse.razorpay_payment_id,
          razorpaySignature: razorpayResponse.razorpay_signature,
          checkoutData: JSON.stringify(checkoutData),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Payment verification failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Payment verification failed: ${response.status} ${response.statusText}`);
      }

      const verifyData = await response.json();

      if (!verifyData?.verified) {
        console.error("Payment not verified:", verifyData);
        throw new Error(verifyData?.error || "Payment verification failed.");
      }

      console.log("Order created successfully:", verifyData.orderId);

      clearCart();
      
      // Fetch order details for the confirmation modal
      setLoadingOrderDetails(true);
      try {
        // Add a small delay to ensure order is fully committed to database
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select(`
            *,
            order_items (*)
          `)
          .eq("id", verifyData.orderId)
          .maybeSingle();

        if (orderError) {
          console.error("Error fetching order details:", orderError);
          // Retry once after a short delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: retryData, error: retryError } = await supabase
            .from("orders")
            .select(`
              *,
              order_items (*)
            `)
            .eq("id", verifyData.orderId)
            .maybeSingle();
          
          if (!retryError && retryData) {
            setConfirmedOrder(retryData);
            setShowOrderConfirmation(true);
            toast({
              title: "Order Placed Successfully!",
              description: `Order #${retryData.order_number || verifyData.orderId} has been confirmed.`,
            });
          } else {
            // If retry also fails, show modal with basic info
            setConfirmedOrder({
              id: verifyData.orderId,
              order_number: verifyData.orderNumber || `ORD-${verifyData.orderId.slice(0, 8).toUpperCase()}`,
              created_at: new Date().toISOString(),
              shipping_address: checkoutData.shipping_address,
              subtotal: checkoutData.subtotal,
              total_amount: checkoutData.total_amount,
              shipping_charge: checkoutData.shipping_charge,
              payment_type: checkoutData.payment_type,
              cod_advance_paid: checkoutData.cod_advance_paid,
              cod_handling_fee: checkoutData.cod_handling_fee,
              cod_balance: checkoutData.cod_balance,
              order_items: [],
            } as any);
            setShowOrderConfirmation(true);
            toast({
              title: "Order Placed Successfully!",
              description: `Order #${verifyData.orderNumber || verifyData.orderId} has been confirmed.`,
            });
          }
        } else if (orderData) {
          setConfirmedOrder(orderData);
          setShowOrderConfirmation(true);
          toast({
            title: "Order Placed Successfully!",
            description: `Order #${orderData.order_number || verifyData.orderId} has been confirmed.`,
          });
        } else {
          // Order not found yet, show modal with basic info and retry in background
          setConfirmedOrder({
            id: verifyData.orderId,
            order_number: verifyData.orderNumber || `ORD-${verifyData.orderId.slice(0, 8).toUpperCase()}`,
            created_at: new Date().toISOString(),
            shipping_address: checkoutData.shipping_address,
            subtotal: checkoutData.subtotal,
            total_amount: checkoutData.total_amount,
            shipping_charge: checkoutData.shipping_charge,
            payment_type: checkoutData.payment_type,
            cod_advance_paid: checkoutData.cod_advance_paid,
            cod_handling_fee: checkoutData.cod_handling_fee,
            cod_balance: checkoutData.cod_balance,
            order_items: [],
          } as any);
          setShowOrderConfirmation(true);
          toast({
            title: "Order Placed Successfully!",
            description: `Order #${verifyData.orderNumber || verifyData.orderId} has been confirmed.`,
          });
          
          // Try to fetch order details in background
          setTimeout(async () => {
            const { data: bgOrderData } = await supabase
              .from("orders")
              .select(`
                *,
                order_items (*)
              `)
              .eq("id", verifyData.orderId)
              .maybeSingle();
            if (bgOrderData) {
              setConfirmedOrder(bgOrderData);
            }
          }, 2000);
        }
      } catch (fetchError) {
        console.error("Error fetching order:", fetchError);
        // Show modal with basic info even on error
        setConfirmedOrder({
          id: verifyData.orderId,
          order_number: verifyData.orderNumber || `ORD-${verifyData.orderId.slice(0, 8).toUpperCase()}`,
          created_at: new Date().toISOString(),
          shipping_address: checkoutData.shipping_address,
          subtotal: checkoutData.subtotal,
          total_amount: checkoutData.total_amount,
          shipping_charge: checkoutData.shipping_charge,
          payment_type: checkoutData.payment_type,
          cod_advance_paid: checkoutData.cod_advance_paid,
          cod_handling_fee: checkoutData.cod_handling_fee,
          cod_balance: checkoutData.cod_balance,
          order_items: [],
        } as any);
        setShowOrderConfirmation(true);
        toast({
          title: "Order Placed Successfully!",
          description: `Order #${verifyData.orderNumber || verifyData.orderId} has been confirmed.`,
        });
      } finally {
        setLoadingOrderDetails(false);
        setIsLoading(false);
      }

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
                {/* Saved Address Selection */}
                {user && savedAddresses.length > 0 && (
                  <div>
                    <Label htmlFor="savedAddress">Use Saved Address</Label>
                    <Select value={selectedAddressId} onValueChange={handleSelectSavedAddress}>
                      <SelectTrigger id="savedAddress">
                        <SelectValue placeholder="Select a saved address or enter new" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>Enter New Address</span>
                          </div>
                        </SelectItem>
                        {savedAddresses.map((address) => (
                          <SelectItem key={address.id} value={address.id}>
                            <div className="flex items-center gap-2">
                              <Home className="w-4 h-4" />
                              <div className="flex flex-col">
                                <span className="font-medium">{address.full_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {address.address_line1}, {address.city}, {address.state} - {address.pincode}
                                  {address.is_default && " (Default)"}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
                      placeholder={isLookingUpPincode ? "Looking up..." : "Auto-filled from pincode"}
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
                      placeholder={isLookingUpPincode ? "Looking up..." : "Auto-filled from pincode"}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="pincode"
                          name="pincode"
                          value={shippingForm.pincode}
                          onChange={handleInputChange}
                          placeholder="Enter 6-digit pincode"
                          maxLength={6}
                          className="pr-8"
                        />
                        {isLookingUpPincode && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
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
                    {shippingForm.pincode.length === 6 && !isLookingUpPincode && (
                      <p className="text-xs text-green-600 mt-1">
                        City and State will be auto-filled
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
                <CardTitle className="flex items-center gap-2 text-primary">
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
                  <div className="bg-muted/50 border border-primary/20 rounded-lg p-4">
                    <h3 className="font-medium flex items-center gap-2 mb-2 text-primary">
                      <CreditCard className="w-4 h-4" />
                      Auto-Payment Setup
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      You'll authorize automatic monthly payments through Razorpay. You can
                      cancel anytime from your account.
                    </p>
                    <ul className="text-xs space-y-1">
                      <li className="flex items-center gap-2 text-foreground/80">
                        <Check className="w-3 h-3 text-primary" />
                        Secure bank authorization
                      </li>
                      <li className="flex items-center gap-2 text-foreground/80">
                        <Check className="w-3 h-3 text-primary" />
                        Cancel anytime
                      </li>
                      <li className="flex items-center gap-2 text-foreground/80">
                        <Check className="w-3 h-3 text-primary" />
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
                          Cash on Delivery (₹{COD_ADVANCE_AMOUNT + COD_HANDLING_FEE} upfront: ₹{COD_ADVANCE_AMOUNT} advance + ₹{COD_HANDLING_FEE} handling)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {paymentType === "cod" && !allItemsAreSubscription && (
                  <div className="bg-muted/50 border border-primary/20 rounded-lg p-4 text-sm">
                    <p className="font-medium mb-2 text-primary">COD Payment Details:</p>
                    <ul className="space-y-1 text-foreground/80">
                      <li>• Pay ₹{COD_ADVANCE_AMOUNT + COD_HANDLING_FEE} now (₹{COD_ADVANCE_AMOUNT} advance + ₹{COD_HANDLING_FEE} handling fee)</li>
                      <li>• Pay remaining ₹{codBalance.toFixed(2)} on delivery</li>
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
                            ? `Pay ₹${COD_ADVANCE_AMOUNT + COD_HANDLING_FEE} & Place Order`
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
              <CardTitle className="text-primary">Order Summary</CardTitle>
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
                        <span className="text-primary/90 ml-1 font-medium">(Subscription)</span>
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
                    <p>Pay now: ₹{COD_ADVANCE_AMOUNT + COD_HANDLING_FEE} (₹{COD_ADVANCE_AMOUNT} advance + ₹{COD_HANDLING_FEE} handling)</p>
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

      {/* Order Confirmation Modal */}
      <Dialog open={showOrderConfirmation} onOpenChange={(open) => {
        if (!open) {
          setShowOrderConfirmation(false);
          navigate("/shop");
        }
      }}>
        <DialogContent 
          className="max-w-3xl max-h-[90vh] overflow-y-auto z-[9999]"
          style={{ zIndex: 9999 }}
        >
          {loadingOrderDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Loading order details...</p>
            </div>
          ) : confirmedOrder ? (
            <>
              <DialogHeader>
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <DialogTitle className="text-2xl">Order Confirmed!</DialogTitle>
                  <DialogDescription className="text-base">
                    Thank you for your order. We've sent a confirmation email to{" "}
                    <span className="font-medium">{confirmedOrder.shipping_address?.email || user?.email}</span>
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Order Number */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>Order #{confirmedOrder.order_number}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {format(new Date(confirmedOrder.created_at), "MMM dd, yyyy 'at' h:mm a")}
                      </span>
                    </CardTitle>
                  </CardHeader>
                </Card>

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="w-5 h-5" />
                      Order Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {confirmedOrder.order_items && confirmedOrder.order_items.length > 0 ? (
                        confirmedOrder.order_items.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center pb-3 border-b last:border-0 last:pb-0"
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
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No items found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin className="w-5 h-5" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{confirmedOrder.shipping_address?.fullName}</p>
                      <p>{confirmedOrder.shipping_address?.addressLine1}</p>
                      {confirmedOrder.shipping_address?.addressLine2 && (
                        <p>{confirmedOrder.shipping_address.addressLine2}</p>
                      )}
                      <p>
                        {confirmedOrder.shipping_address?.city}, {confirmedOrder.shipping_address?.state} -{" "}
                        {confirmedOrder.shipping_address?.pincode}
                      </p>
                      {confirmedOrder.shipping_address?.landmark && (
                        <p className="text-muted-foreground">
                          Landmark: {confirmedOrder.shipping_address.landmark}
                        </p>
                      )}
                      <p className="pt-2">
                        <span className="text-muted-foreground">Phone:</span>{" "}
                        {confirmedOrder.shipping_address?.phone}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CreditCard className="w-5 h-5" />
                      Payment Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₹{confirmedOrder.subtotal?.toFixed(2) || "0.00"}</span>
                      </div>
                      {confirmedOrder.discount_amount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount</span>
                          <span>-₹{confirmedOrder.discount_amount.toFixed(2)}</span>
                        </div>
                      )}
                      {confirmedOrder.shipping_charge > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Shipping</span>
                          <span>₹{confirmedOrder.shipping_charge?.toFixed(2) || "0.00"}</span>
                        </div>
                      )}
                      {confirmedOrder.payment_type === "cod" && confirmedOrder.cod_handling_fee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">COD Handling Fee</span>
                          <span>₹{confirmedOrder.cod_handling_fee?.toFixed(2) || "0.00"}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Method</span>
                        <span className="capitalize">
                          {confirmedOrder.payment_type === "cod" ? "Cash on Delivery" : "Online Payment"}
                        </span>
                      </div>
                      
                      {/* COD Breakdown */}
                      {confirmedOrder.payment_type === "cod" && (
                        <>
                          <div className="pt-2 border-t space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Upfront Payment</span>
                              <span className="font-medium text-primary">₹{((confirmedOrder.cod_advance_paid || 0) + (confirmedOrder.cod_handling_fee || 0)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground pl-2">
                              <span>• Advance (from product): ₹{confirmedOrder.cod_advance_paid?.toFixed(2) || "100.00"}</span>
                              <span>• COD Handling Fee: ₹{confirmedOrder.cod_handling_fee?.toFixed(2) || "50.00"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Balance on Delivery</span>
                              <span className="font-medium">₹{confirmedOrder.cod_balance?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-sm pt-1 border-t">
                              <span className="text-muted-foreground">Total Order Value</span>
                              <span className="font-semibold">₹{confirmedOrder.total_amount?.toFixed(2) || "0.00"}</span>
                            </div>
                            <div className="text-xs text-muted-foreground pt-1 italic">
                              Total = Product (₹{confirmedOrder.subtotal?.toFixed(2) || "0.00"}) + Shipping (₹{confirmedOrder.shipping_charge?.toFixed(2) || "0.00"}) + COD Handling (₹{confirmedOrder.cod_handling_fee?.toFixed(2) || "0.00"})
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Prepaid Payment */}
                      {confirmedOrder.payment_type !== "cod" && (
                        <div className="pt-2 border-t flex justify-between font-semibold">
                          <span>Total Paid</span>
                          <span>₹{confirmedOrder.total_amount?.toFixed(2) || "0.00"}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tracking Information */}
                {confirmedOrder.dtdc_awb_number ? (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Truck className="w-5 h-5 text-primary" />
                        Track Your Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Tracking Number (AWB)</p>
                          <p className="text-lg font-mono font-semibold text-primary">
                            {confirmedOrder.dtdc_awb_number}
                          </p>
                        </div>
                        <Button asChild className="w-full sm:w-auto">
                          <a
                            href={`https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${confirmedOrder.dtdc_awb_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            Track Shipment
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-muted">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Truck className="w-5 h-5" />
                        <div>
                          <p className="text-sm font-medium">Shipment being prepared</p>
                          <p className="text-xs">Your tracking number will be available shortly.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setShowOrderConfirmation(false);
                      navigate("/account/orders");
                    }}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    View All Orders
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => {
                      setShowOrderConfirmation(false);
                      navigate("/shop");
                    }}
                  >
                    Continue Shopping
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;