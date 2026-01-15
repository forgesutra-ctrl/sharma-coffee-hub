import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/coffee/Layout';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, MapPin, Truck, Weight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { PincodeDialog } from '@/components/PincodeDialog';

const Cart = () => {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    getCartTotal,
    clearCart,
    shippingInfo,
    setShippingPincode,
    getShippingCharge,
    getGrandTotal,
    getCartWeight,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPincodeDialog, setShowPincodeDialog] = useState(false);

  // Check if cart has subscription items
  const hasSubscriptionItems = cartItems.some(item => item.is_subscription);
  const allItemsAreSubscription = cartItems.length > 0 && cartItems.every(item => item.is_subscription);

  const handleCheckout = () => {
    if (!shippingInfo) {
      setShowPincodeDialog(true);
      return;
    }
    
    if (!user) {
      navigate('/auth', { state: { from: '/checkout' } });
    } else {
      navigate('/checkout');
    }
  };

  const handlePincodeValidated = (pincode: string) => {
    setShippingPincode(pincode);
  };

  if (cartItems.length === 0) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
              Your cart is empty
            </h1>
            <p className="text-muted-foreground mb-6">
              Looks like you haven't added any coffee yet.
            </p>
            <Link to="/shop">
              <Button className="gap-2">
                Browse Coffee
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const subtotal = getCartTotal();
  // Free shipping if all items are subscription, otherwise calculate normally
  const shipping = allItemsAreSubscription ? 0 : getShippingCharge();
  const grandTotal = subtotal + shipping;
  const cartWeight = getCartWeight();

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-8">
            Your Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
          </h1>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={`${item.product.id}-${item.weight}`}
                  className={`bg-card border rounded-xl p-4 flex gap-4 ${
                    item.is_subscription ? 'border-primary/30' : 'border-border'
                  }`}
                >
                  {/* Product Image */}
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                    <img
                      src={item.product.image_url || item.product.images?.[0] || ''}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                    {item.is_subscription && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground p-1 rounded-full">
                        <RefreshCw className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {item.product.name}
                    </h3>
                    <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      <p>{item.weight >= 1000 ? `${item.weight / 1000} kg` : `${item.weight}g`}</p>
                    </div>
                    
                    {/* Subscription Badge */}
                    {item.is_subscription && (
                      <div className="mt-2 space-y-1">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary text-xs font-semibold rounded">
                          <RefreshCw className="w-3 h-3" />
                          Monthly Subscription
                        </span>
                        <p className="text-xs text-green-600 font-medium">
                          ✓ Free Shipping
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-primary font-semibold">
                        ₹{item.product.price}
                      </p>
                      {item.is_subscription && (
                        <span className="text-xs text-muted-foreground">/month</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeFromCart(item.product.id, item.weight)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 bg-muted rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.weight, Math.max(1, item.quantity - 1))}
                        className="p-2 hover:bg-background/50 rounded-l-lg transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.weight, item.quantity + 1)}
                        className="p-2 hover:bg-background/50 rounded-r-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={clearCart}
                className="text-sm text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear cart
              </button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Order Summary
                </h2>

                {/* Subscription Notice */}
                {hasSubscriptionItems && (
                  <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                      <RefreshCw className="w-4 h-4" />
                      <span>Subscription items in cart</span>
                    </div>
                    {allItemsAreSubscription && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        ✓ Free Shipping applied
                      </p>
                    )}
                  </div>
                )}

                {/* Delivery Location */}
                <div className="mb-4 p-3 bg-muted/30 border border-border/50 rounded-lg">
                  {shippingInfo ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{shippingInfo.pincode}</span>
                        </div>
                        <button
                          onClick={() => setShowPincodeDialog(true)}
                          className="text-primary text-xs hover:underline"
                        >
                          Change
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">{shippingInfo.region}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPincodeDialog(true)}
                      className="flex items-center gap-2 text-sm text-primary hover:underline w-full"
                    >
                      <MapPin className="w-4 h-4" />
                      Enter delivery PIN code
                    </button>
                  )}
                </div>

                {/* Cart Weight */}
                <div className="mb-4 p-3 bg-muted/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Weight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total Weight:</span>
                    <span className="font-medium">
                      {cartWeight >= 1000 ? `${(cartWeight / 1000).toFixed(2)} kg` : `${cartWeight}g`}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{subtotal}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Shipping
                    </span>
                    {allItemsAreSubscription ? (
                      <span className="font-medium text-green-600">FREE</span>
                    ) : shippingInfo ? (
                      <span className="font-medium">₹{shipping}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Enter PIN</span>
                    )}
                  </div>
                  {shippingInfo && !allItemsAreSubscription && shippingInfo.multiplier > 0 && (
                    <div className="text-xs text-muted-foreground pl-5">
                      {shippingInfo.region}: ₹{(shipping / shippingInfo.multiplier).toFixed(0)}/kg × {shippingInfo.multiplier} kg
                    </div>
                  )}
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between text-base">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary">₹{grandTotal}</span>
                    </div>
                    {hasSubscriptionItems && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Subscription items will be billed monthly
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full mt-6 h-12 text-base font-medium gap-2"
                >
                  {!shippingInfo 
                    ? 'Enter PIN to Continue'
                    : user 
                      ? 'Proceed to Checkout' 
                      : 'Login to Checkout'
                  }
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {!user && shippingInfo && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    You'll need to login to complete your order
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pincode Dialog */}
      <PincodeDialog
        open={showPincodeDialog}
        onOpenChange={setShowPincodeDialog}
        onPincodeValidated={handlePincodeValidated}
        currentPincode={shippingInfo?.pincode}
      />
    </Layout>
  );
};

export default Cart;