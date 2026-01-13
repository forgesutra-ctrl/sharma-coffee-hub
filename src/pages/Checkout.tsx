import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/coffee/Layout';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Check, Loader2, Package, MapPin, CreditCard, AlertCircle, Truck } from 'lucide-react';
import { shippingAddressSchema } from '@/lib/validation';
import { COD_ADVANCE_AMOUNT, COD_HANDLING_FEE } from '@/lib/shipping';
import logger from '@/lib/logger';

type CheckoutStep = 'shipping' | 'review' | 'payment';
type PaymentType = 'prepaid' | 'cod';

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
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
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
  };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

const Checkout = () => {
  const { 
    cartItems, 
    getCartTotal, 
    clearCart, 
    shippingInfo,
    getShippingCharge,
    isCodAvailable,
    getCodAdvance,
    getCodHandlingFee,
    getCodBalance,
    getGrandTotal,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('prepaid');

  const [shippingForm, setShippingForm] = useState<ShippingForm>({
    fullName: '',
    email: user?.email || '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: shippingInfo?.pincode || '',
    landmark: '',
  });

  const steps: { id: CheckoutStep; label: string; icon: React.ReactNode }[] = [
    { id: 'shipping', label: 'Shipping', icon: <MapPin className="w-4 h-4" /> },
    { id: 'review', label: 'Review', icon: <Package className="w-4 h-4" /> },
    { id: 'payment', label: 'Payment', icon: <CreditCard className="w-4 h-4" /> },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setShippingForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateShipping = (): boolean => {
    const result = shippingAddressSchema.safeParse(shippingForm);
    
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: 'Validation Error',
        description: firstError?.message || 'Please check your shipping details',
        variant: 'destructive',
      });
      return false;
    }
    
    return true;
  };

  const handleNextStep = () => {
    if (step === 'shipping' && !validateShipping()) return;
    
    const stepOrder: CheckoutStep[] = ['shipping', 'review', 'payment'];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex < stepOrder.length - 1) {
      setStep(stepOrder[currentIndex + 1]);
    }
  };

  const handlePrevStep = () => {
    const stepOrder: CheckoutStep[] = ['shipping', 'review', 'payment'];
    const currentIndex = stepOrder.indexOf(step);
    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1]);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const createOrder = async () => {
    const subtotal = getCartTotal();
    const shippingCharge = getShippingCharge();
    const codHandlingFee = paymentType === 'cod' ? COD_HANDLING_FEE : 0;
    const codAdvance = paymentType === 'cod' ? COD_ADVANCE_AMOUNT : 0;
    const total = subtotal + shippingCharge + codHandlingFee;
    const codBalance = paymentType === 'cod' ? total - codAdvance : 0;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id,
        order_number: '',
        subtotal,
        total_amount: total,
        shipping_address: {
          fullName: shippingForm.fullName,
          phone: shippingForm.phone,
          addressLine1: shippingForm.addressLine1,
          addressLine2: shippingForm.addressLine2,
          city: shippingForm.city,
          state: shippingForm.state,
          pincode: shippingForm.pincode,
          landmark: shippingForm.landmark,
        },
        pincode: shippingForm.pincode,
        shipping_region: shippingInfo?.region || '',
        shipping_charge: shippingCharge,
        payment_type: paymentType,
        cod_advance_paid: codAdvance,
        cod_handling_fee: codHandlingFee,
        cod_balance: codBalance,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items with variant info
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_name: item.product.name,
      weight: item.weight,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity,
      variant_id: item.variant_id || null,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return order;
  };

  const initiateRazorpayPayment = async (order: { id: string; order_number: string }) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error('Failed to load payment gateway');
    }

    const amount = paymentType === 'cod' ? COD_ADVANCE_AMOUNT : getGrandTotal('prepaid');
    const isPartialCod = paymentType === 'cod';

    // Create Razorpay order via edge function
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: { orderId: order.id, amount, isPartialCod },
    });

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create payment order');
    }

    return new Promise<void>((resolve, reject) => {
      const options: RazorpayOptions = {
        key: data.razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Sharma Coffee Works',
        description: isPartialCod ? 'COD Advance Payment' : 'Order Payment',
        order_id: data.razorpayOrderId,
        handler: async (response: RazorpayResponse) => {
          try {
            // Verify payment on server
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId: order.id,
              },
            });

            if (verifyError || !verifyData?.verified) {
              throw new Error('Payment verification failed');
            }

            resolve();
          } catch (err) {
            reject(err);
          }
        },
        prefill: {
          name: shippingForm.fullName,
          email: shippingForm.email,
          contact: shippingForm.phone,
        },
        theme: {
          color: '#C8A97E',
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled'));
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    });
  };

  const handlePlaceOrder = async () => {
    setIsLoading(true);
    try {
      const order = await createOrder();
      setOrderId(order.id);
      setOrderNumber(order.order_number);

      await initiateRazorpayPayment(order);

      clearCart();
      
      toast({
        title: 'Payment Successful!',
        description: paymentType === 'cod' 
          ? 'Your COD advance has been received. Pay the balance on delivery.'
          : 'Your order has been placed successfully.',
      });
    } catch (error: unknown) {
      logger.error('Order/Payment failed', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      if (errorMessage === 'Payment cancelled') {
        toast({
          title: 'Payment Cancelled',
          description: 'Your order is saved. You can retry the payment.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Payment Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (cartItems.length === 0 && !orderId) {
    navigate('/cart');
    return null;
  }

  if (!shippingInfo) {
    navigate('/cart');
    return null;
  }

  const subtotal = getCartTotal();
  const shippingCharge = getShippingCharge();
  const codHandlingFee = paymentType === 'cod' ? COD_HANDLING_FEE : 0;
  const grandTotal = getGrandTotal(paymentType);
  const codBalance = getCodBalance(paymentType);
  const codAvailable = isCodAvailable();

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4">
              {steps.map((s, index) => (
                <div key={s.id} className="flex items-center">
                  <div
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                      ${step === s.id
                        ? 'bg-primary text-primary-foreground'
                        : steps.indexOf(steps.find(st => st.id === step)!) > index
                          ? 'bg-green-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      }
                    `}
                  >
                    {steps.indexOf(steps.find(st => st.id === step)!) > index ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      s.icon
                    )}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-8 h-0.5 bg-border mx-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {step === 'shipping' && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Shipping Details
                  </h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={shippingForm.fullName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={shippingForm.email}
                        onChange={handleInputChange}
                        placeholder="john@example.com"
                        className="mt-1"
                        disabled
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={shippingForm.phone}
                        onChange={handleInputChange}
                        placeholder="9876543210"
                        maxLength={10}
                        className="mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="addressLine1">Address Line 1 *</Label>
                      <Input
                        id="addressLine1"
                        name="addressLine1"
                        value={shippingForm.addressLine1}
                        onChange={handleInputChange}
                        placeholder="House/Flat No., Building Name"
                        className="mt-1"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="addressLine2">Address Line 2</Label>
                      <Input
                        id="addressLine2"
                        name="addressLine2"
                        value={shippingForm.addressLine2}
                        onChange={handleInputChange}
                        placeholder="Street, Area"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={shippingForm.city}
                        onChange={handleInputChange}
                        placeholder="Mumbai"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={shippingForm.state}
                        onChange={handleInputChange}
                        placeholder="Maharashtra"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        name="pincode"
                        value={shippingForm.pincode}
                        onChange={handleInputChange}
                        placeholder="400001"
                        maxLength={6}
                        className="mt-1"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Delivering to: {shippingInfo.region}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="landmark">Landmark</Label>
                      <Input
                        id="landmark"
                        name="landmark"
                        value={shippingForm.landmark}
                        onChange={handleInputChange}
                        placeholder="Near..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 'review' && (
                <div className="space-y-6">
                  {/* Shipping Address Summary */}
                  <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Shipping Address
                      </h2>
                      <button
                        onClick={() => setStep('shipping')}
                        className="text-sm text-primary hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="text-muted-foreground">
                      <p className="font-medium text-foreground">{shippingForm.fullName}</p>
                      <p>{shippingForm.addressLine1}</p>
                      {shippingForm.addressLine2 && <p>{shippingForm.addressLine2}</p>}
                      <p>{shippingForm.city}, {shippingForm.state} - {shippingForm.pincode}</p>
                      <p>Phone: {shippingForm.phone}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      Order Items
                    </h2>
                    <div className="space-y-4">
                      {cartItems.map((item) => (
                        <div
                          key={`${item.product.id}-${item.weight}`}
                          className="flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={item.product.image_url || item.product.images?.[0] || ''}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.weight >= 1000 ? `${item.weight / 1000} kg` : `${item.weight}g`} • Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-foreground">
                            ₹{item.product.price * item.quantity}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      Payment Method
                    </h2>
                    
                    <RadioGroup
                      value={paymentType}
                      onValueChange={(value) => setPaymentType(value as PaymentType)}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-3 p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                        <RadioGroupItem value="prepaid" id="prepaid" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="prepaid" className="font-medium cursor-pointer">
                            Pay Online (Prepaid)
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Pay the full amount now via UPI, Cards, or Net Banking
                          </p>
                        </div>
                      </div>

                      {codAvailable && (
                        <div className="flex items-start space-x-3 p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                          <RadioGroupItem value="cod" id="cod" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="cod" className="font-medium cursor-pointer">
                              Cash on Delivery (COD)
                            </Label>
                            <div className="text-sm text-muted-foreground space-y-1 mt-1">
                              <p className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Requires ₹{COD_ADVANCE_AMOUNT} non-refundable advance
                              </p>
                              <p>+ ₹{COD_HANDLING_FEE} COD handling fee</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </RadioGroup>
                  </div>
                </div>
              )}

              {step === 'payment' && orderNumber && (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600/20 mb-6">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                    Order Placed Successfully!
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Your order <span className="font-medium text-foreground">{orderNumber}</span> has been placed.
                  </p>
                  {paymentType === 'cod' && (
                    <div className="bg-muted/30 border border-border rounded-lg p-4 mb-4 text-sm">
                      <p className="font-medium text-foreground mb-2">COD Payment Details</p>
                      <p className="text-muted-foreground">
                        Advance paid: ₹{COD_ADVANCE_AMOUNT}<br />
                        Balance to pay on delivery: ₹{codBalance}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mb-6">
                    We'll send you an email confirmation shortly.
                  </p>
                  <Button onClick={() => navigate('/')} className="gap-2">
                    Continue Shopping
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {step === 'payment' && !orderNumber && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Complete Payment
                  </h2>
                  
                  {paymentType === 'cod' ? (
                    <div className="space-y-4">
                      <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <h3 className="font-medium mb-2">COD Advance Payment</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Pay ₹{COD_ADVANCE_AMOUNT} advance now to confirm your order. 
                          The remaining ₹{codBalance} will be collected on delivery.
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <p>• Advance is non-refundable</p>
                          <p>• COD handling fee: ₹{COD_HANDLING_FEE}</p>
                        </div>
                      </div>
                      <Button
                        onClick={handlePlaceOrder}
                        disabled={isLoading}
                        className="w-full h-12 text-base font-medium"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Pay ₹{COD_ADVANCE_AMOUNT} Advance
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        You will be redirected to our secure payment gateway to complete your payment.
                      </p>
                      <Button
                        onClick={handlePlaceOrder}
                        disabled={isLoading}
                        className="w-full h-12 text-base font-medium"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Pay ₹{grandTotal}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              {step !== 'payment' && (
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={step === 'shipping'}
                    className="gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button onClick={handleNextStep} className="gap-2">
                    {step === 'review' ? 'Proceed to Payment' : 'Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            {!orderNumber && (
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Order Summary
                  </h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Items ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
                      </span>
                      <span className="font-medium">₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Shipping ({shippingInfo.region})
                      </span>
                      <span className="font-medium">₹{shippingCharge}</span>
                    </div>
                    {paymentType === 'cod' && (
                      <div className="flex justify-between text-amber-600">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          COD Handling Fee
                        </span>
                        <span className="font-medium">₹{codHandlingFee}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-3 mt-3">
                      <div className="flex justify-between text-base">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-primary">₹{grandTotal}</span>
                      </div>
                      {paymentType === 'cod' && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          <div className="flex justify-between">
                            <span>Pay now (advance)</span>
                            <span>₹{COD_ADVANCE_AMOUNT}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pay on delivery</span>
                            <span>₹{codBalance}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
