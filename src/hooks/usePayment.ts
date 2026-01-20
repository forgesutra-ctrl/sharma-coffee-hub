import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  product_id: string;
  variant_id: string;
  quantity: number;
  price: number;
}

interface OrderData {
  cart_items: CartItem[];
  shipping_address: Record<string, any>;
  payment_type: "prepaid" | "cod";
  total_amount: number;
  shipping_charge: number;
  cod_handling_fee?: number;
  cod_advance_paid?: number;
}

interface SubscriptionData {
  product_id: string;
  variant_id: string;
  quantity: number;
  preferred_delivery_date: number;
  total_deliveries: number;
  shipping_address: Record<string, any>;
}

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const createOrder = async (orderData: OrderData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("You must be logged in to place an order");
      }

      // Call create-razorpay-order edge function
      const { data, error: functionError } = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          user_id: session.user.id,
          access_token: session.access_token,
          ...orderData,
        },
      });

      if (functionError) {
        throw new Error(functionError.message || "Failed to create order");
      }

      if (!data?.razorpay_order_id) {
        throw new Error("Invalid response from server");
      }

      // Open Razorpay payment popup
      const razorpayKeyId = data.razorpay_key_id;
      const amount = data.amount; // Amount in paise

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }

      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: amount,
        currency: "INR",
        name: "Sharma Coffee Works",
        description: "Order Payment",
        order_id: data.razorpay_order_id,
        handler: async (response: any) => {
          // Verify payment
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            "verify-razorpay-payment",
            {
              body: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                checkoutData: JSON.stringify(orderData),
              },
            }
          );

          if (verifyError || !verifyData?.verified) {
            toast({
              title: "Payment verification failed",
              description: "Please contact support if payment was deducted.",
              variant: "destructive",
            });
            navigate("/payment-failed?reason=verification_failed");
            return;
          }

          // Redirect to success page
          navigate(`/payment-success?order_id=${verifyData.order_id}`);
        },
        prefill: {
          name: orderData.shipping_address.fullName || "",
          email: orderData.shipping_address.email || "",
          contact: orderData.shipping_address.phone || "",
        },
        theme: {
          color: "#8B4513",
        },
        modal: {
          ondismiss: () => {
            toast({
              title: "Payment cancelled",
              description: "Your order was not placed.",
            });
          },
        },
      });

      razorpay.open();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create order";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSubscription = async (subscriptionData: SubscriptionData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("You must be logged in to create a subscription");
      }

      // Call create-razorpay-subscription edge function
      const { data, error: functionError } = await supabase.functions.invoke(
        "create-razorpay-subscription",
        {
          body: {
            user_id: session.user.id,
            access_token: session.access_token,
            ...subscriptionData,
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message || "Failed to create subscription");
      }

      if (!data?.short_url) {
        throw new Error("Invalid response from server");
      }

      // Redirect to Razorpay payment page
      window.location.href = data.short_url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create subscription";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createOrder,
    createSubscription,
    isLoading,
    error,
  };
}
