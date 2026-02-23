import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  MapPin,
  Truck,
  Package,
  RefreshCw,
  Loader2
} from 'lucide-react';
import PincodeDialog from '@/components/coffee/PincodeDialog';

const Cart = () => {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    getCartTotal,
    shippingInfo,
    setShippingInfo,
    getShippingCharge,
    getCartWeight,
  } = useCart();

  const [isPincodeDialogOpen, setIsPincodeDialogOpen] = useState(false);
  const { data: allProducts } = useProducts();

  // "Customers also bought" - products from same category as cart items, excluding cart
  const cartProductIds = useMemo(() => new Set(cartItems.map((i) => i.product.id)), [cartItems]);
  const cartCategoryIds = useMemo(() => {
    if (!allProducts) return new Set<string>();
    const ids = new Set<string>();
    for (const item of cartItems) {
      const p = allProducts.find((x) => x.id === item.product.id);
      if (p?.category_id) ids.add(p.category_id);
    }
    return ids;
  }, [cartItems, allProducts]);
  const recommendations = useMemo(() => {
    if (!allProducts || cartCategoryIds.size === 0) return [];
    return allProducts
      .filter((p) => p.category_id && cartCategoryIds.has(p.category_id) && !cartProductIds.has(p.id))
      .slice(0, 4);
  }, [allProducts, cartCategoryIds, cartProductIds]);

const handlePincodeValidated = (
  pincode: string,
  region: string,
  baseRate: number,
  codAvailable: boolean
) => {
  const weight = getCartWeight();
  const weightInKg = weight / 1000;
  const multiplier = Math.ceil(weightInKg) || 1;
  
  setShippingInfo({
    pincode,
    region,
    baseRate,
    multiplier,
    codAvailable,
    weight,
  });
  setIsPincodeDialogOpen(false);
};
  // Show empty cart UI - DON'T navigate, just render
  if (cartItems.length === 0) {
    return (
        <div className="min-h-screen bg-background py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-12 h-12 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-3">
                Your cart is empty
              </h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Looks like you haven't added any coffee to your cart yet.
                Explore our collection of premium coffees.
              </p>
              <Link to="/shop">
                <Button size="lg" className="gap-2">
                  <Package className="w-5 h-5" />
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
    );
  }

  const subtotal = getCartTotal();
  const shippingCharge = shippingInfo ? getShippingCharge() : 0;
  const hasSubscriptionItems = cartItems.some(item => item.is_subscription);
  const allItemsAreSubscription = cartItems.every(item => item.is_subscription);

  return (
    <>
      <div className="min-h-screen bg-background py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Shopping Cart
            </h1>
            <p className="text-muted-foreground mt-2">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={`${item.product.id}-${item.weight}-${item.is_subscription}`}
                  className="bg-card border border-border rounded-xl p-4 md:p-6"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                      <img
                        src={item.product.image_url || item.product.images?.[0] || '/placeholder.svg'}
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
                      <div className="flex justify-between items-start">
                        <div>
                          <Link
                            to={`/product/${item.product.slug}`}
                            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
                          >
                            {item.product.name}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.weight >= 1000 ? `${item.weight / 1000} kg` : `${item.weight}g`}
                          </p>
                          {item.is_subscription && (
                            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded">
                              <RefreshCw className="w-3 h-3" />
                              Monthly Subscription
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.weight, item.is_subscription)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity and Price */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.weight, item.quantity - 1, item.is_subscription)}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.weight, item.quantity + 1, item.is_subscription)}
                            className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            ₹{item.product.price * item.quantity}
                          </p>
                          {item.is_subscription && (
                            <p className="text-xs text-muted-foreground">/month</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Order Summary
                </h2>

                {/* Delivery Check */}
                <div className="mb-6 pb-6 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      Delivery Location
                    </span>
                  </div>

                  {shippingInfo ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">
                            ✓ Delivering to {shippingInfo.pincode}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {shippingInfo.region}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsPincodeDialogOpen(true)}
                          className="text-xs"
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => setIsPincodeDialogOpen(true)}
                    >
                      <MapPin className="w-4 h-4" />
                      Check Delivery Availability
                    </Button>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">₹{subtotal}</span>
                  </div>

                  {shippingInfo && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Shipping
                      </span>
                      {allItemsAreSubscription ? (
                        <span className="font-medium text-green-600">FREE</span>
                      ) : (
                        <span className="font-medium">₹{shippingCharge}</span>
                      )}
                    </div>
                  )}

                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between text-base">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary">
                        ₹{subtotal + (allItemsAreSubscription ? 0 : shippingCharge)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subscription Notice */}
                {hasSubscriptionItems && (
                  <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-primary">Subscription items:</strong> You'll be charged monthly. Cancel anytime.
                    </p>
                  </div>
                )}

                {/* Checkout Button */}
                {shippingInfo ? (
                  <Link to="/checkout" className="block mt-6">
                    <Button className="w-full h-12 text-base font-medium gap-2">
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full mt-6 h-12 text-base font-medium gap-2"
                    onClick={() => setIsPincodeDialogOpen(true)}
                  >
                    Check Delivery to Continue
                    <MapPin className="w-4 h-4" />
                  </Button>
                )}

                {/* Continue Shopping */}
                <Link
                  to="/shop"
                  className="block text-center mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>

          {/* Customers also bought */}
          {recommendations.length > 0 && (
            <div className="mt-12 pt-12 border-t border-border/50">
              <h2 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-6">
                Customers also bought
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {recommendations.map((p) => {
                  const price = p.product_variants?.length
                    ? Math.min(...p.product_variants.map((v) => v.price))
                    : 0;
                  return (
                    <Link
                      key={p.id}
                      to={`/product/${p.slug}`}
                      className="group"
                    >
                      <div className="aspect-square overflow-hidden bg-card rounded-lg mb-3">
                        <img
                          src={p.image_url || '/placeholder.svg'}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-2">
                        {p.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        from ₹{price.toLocaleString()}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pincode Dialog */}
      <PincodeDialog
        isOpen={isPincodeDialogOpen}
        onClose={() => setIsPincodeDialogOpen(false)}
        onPincodeValidated={handlePincodeValidated}
        initialPincode={shippingInfo?.pincode || ''}
      />
    </>
  );
};

export default Cart;
