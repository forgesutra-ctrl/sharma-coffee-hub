import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Minus, Plus, ShoppingBag, Check, Loader2, MapPin, RefreshCw, Package, AlertCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Product, ProductV2, ProductVariant } from '@/types';
import { useProductBySlug, useProducts, isPurchasableProduct, DatabaseProduct } from '@/hooks/useProducts';
import { PincodeDialog } from '@/components/PincodeDialog';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { validateSubscriptionPlan } from '@/lib/subscription-validation';

const ProductDetail = () => {
  const { slug } = useParams<{ slug?: string }>();
  const { addToCart, shippingInfo, setShippingPincode, getShippingCharge } = useCart();

  const { data: product, isLoading, error } = useProductBySlug(slug);
  const { data: allProducts } = useProducts();

  // Check if this product has child products (variants like different blends)
  const hasChildProducts = (product?.child_products?.length ?? 0) > 0;
  const childProducts = product?.child_products || [];

  // State for child product selection (if applicable)
  const [selectedChildProduct, setSelectedChildProduct] = useState<DatabaseProduct | null>(null);

  // Get the active product (child if selected, otherwise parent)
  const activeProduct = selectedChildProduct || product;
  const variants = activeProduct?.product_variants || [];
  const isProductPurchasable = isPurchasableProduct(activeProduct);

  const [selectedWeight, setSelectedWeight] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [imageError, setImageError] = useState(false);
  const [showPincodeDialog, setShowPincodeDialog] = useState(false);
  const [purchaseType, setPurchaseType] = useState<'one-time' | 'subscription'>('one-time');
  const [subscriptionPlanValid, setSubscriptionPlanValid] = useState(false);
  const [subscriptionPlanError, setSubscriptionPlanError] = useState<string | null>(null);

  // Set default selected child product when product loads
  useEffect(() => {
    if (product && hasChildProducts && !selectedChildProduct) {
      setSelectedChildProduct(childProducts[0]);
    }
  }, [product, hasChildProducts, childProducts, selectedChildProduct]);

  // Set default selected weight when active product changes
  useEffect(() => {
    if (activeProduct && variants.length > 0) {
      // Default to 500g if available, otherwise first variant
      const defaultVariant = variants.find(v => v.weight === 500) || variants[0];
      setSelectedWeight(defaultVariant.weight);
    }
  }, [activeProduct?.id, variants]);

  // Reset weight when child product changes
  const handleChildProductChange = (child: DatabaseProduct) => {
    setSelectedChildProduct(child);
    setSelectedWeight(null); // Reset weight selection
  };

  // Validate subscription plan when active product or selected variant changes
  useEffect(() => {
    if (!activeProduct) {
      setSubscriptionPlanValid(false);
      setSubscriptionPlanError(null);
      return;
    }

    // Get selected variant
    const currentVariant = variants.find(v => v.weight === selectedWeight) || variants[0];

    // Check plan ID: variant first, then product (same priority as checkout)
    const planId = currentVariant?.razorpay_plan_id || activeProduct.razorpay_plan_id;

    // Debug log to verify razorpay_plan_id is present
    console.log("Fetched product:", {
      id: activeProduct.id,
      name: activeProduct.name,
      subscription_eligible: activeProduct.subscription_eligible,
      product_razorpay_plan_id: activeProduct.razorpay_plan_id,
      variant_razorpay_plan_id: currentVariant?.razorpay_plan_id,
      final_plan_id: planId,
    });

    // Validate using a product-like object with the final plan ID
    const validation = validateSubscriptionPlan({
      subscription_eligible: activeProduct.subscription_eligible,
      razorpay_plan_id: planId,
    });
    setSubscriptionPlanValid(validation.isValid);
    setSubscriptionPlanError(validation.error || null);
  }, [
    activeProduct?.id,
    activeProduct?.subscription_eligible,
    activeProduct?.razorpay_plan_id,
    selectedWeight,
    variants,
  ]);

  // Loading state
  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  // Error state
  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-2xl mb-4">Error loading product</h1>
            <Link to="/shop" className="text-primary hover:underline">
              Return to shop
            </Link>
          </div>
        </div>
    );
  }

  // Product not found
  if (!product) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-2xl mb-4">Product not found</h1>
            <Link to="/shop" className="text-primary hover:underline">
              Return to shop
            </Link>
          </div>
        </div>
    );
  }

  // Get selected variant
  const selectedVariant = variants.find(v => v.weight === selectedWeight) || variants[0];
  const currentPrice = selectedVariant?.price || 0;
  
  // No discount for subscription - same price as one-time
  const isSubscriptionSelected = purchaseType === 'subscription' && activeProduct?.subscription_eligible;
  const totalPrice = currentPrice * quantity;

  // Get related products from same category
  const relatedProducts = allProducts
    ?.filter(p => p.category_id === product?.category_id && p.id !== product?.id)
    .slice(0, 4) || [];

  const executeAddToCart = () => {
    if (!selectedVariant || !activeProduct) return;

    // Same price for both subscription and one-time (no discount)
    const isSubscription = purchaseType === 'subscription' && activeProduct.subscription_eligible;

    // Fail-fast validation: If subscription is selected but plan is not valid, prevent adding to cart
    if (isSubscription && !subscriptionPlanValid) {
      const errorMsg = subscriptionPlanError || "Subscription plan not configured for this product";
      toast.error(errorMsg);
      return;
    }

    const cartProduct: Product = {
      id: activeProduct.id,
      name: activeProduct.name,
      slug: activeProduct.slug,
      description: activeProduct.description || '',
      short_description: (activeProduct.description || '').slice(0, 100),
      price: currentPrice,
      image_url: activeProduct.image_url || '/placeholder.svg',
      images: [activeProduct.image_url || '/placeholder.svg'],
      roast_level: (activeProduct.roast_level as 'Light' | 'Medium' | 'Dark') || 'Medium',
      has_chicory: false,
      origin: activeProduct.origin || 'Coorg, Karnataka',
      flavor_notes: activeProduct.flavor_notes || [],
      available_weights: variants.map(v => v.weight),
      brewing_methods: [],
      storage_tips: '',
      is_featured: activeProduct.is_featured || false,
      in_stock: (selectedVariant.stock_quantity ?? 0) > 0,
      sort_order: 0,
      subscription_eligible: activeProduct.subscription_eligible || false,
      razorpay_plan_id: activeProduct.razorpay_plan_id || null,
      created_at: activeProduct.created_at,
      updated_at: activeProduct.updated_at,
    };

    // Debug log to verify cart product has razorpay_plan_id
    console.log("Cart product:", {
      id: cartProduct.id,
      name: cartProduct.name,
      subscription_eligible: cartProduct.subscription_eligible,
      razorpay_plan_id: cartProduct.razorpay_plan_id,
    });

    addToCart({
      product: cartProduct,
      weight: selectedWeight || 250,
      quantity,
      variant_id: selectedVariant.id,
      is_subscription: isSubscription,
      original_price: currentPrice,
    });
    
    toast.success(
      isSubscription 
        ? `${activeProduct.name} subscription added to cart` 
        : `${activeProduct.name} added to cart`
    );
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    // Add to cart immediately - pincode is optional at this stage
    executeAddToCart();
  };

  const handlePincodeValidated = (pincode: string, shippingCharge: number, region: string) => {
    setShippingPincode(pincode);
  };

  return (
      <div className="min-h-screen bg-background">
        {/* Announcement Bar */}
        <div className="bg-primary text-primary-foreground py-2.5 text-center text-xs font-medium tracking-[0.2em] uppercase">
          Free Shipping — A Privilege Extended Only to Our Subscription Members
        </div>

        {/* Breadcrumb */}
        <div className="border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center gap-2 text-sm flex-wrap" aria-label="Breadcrumb">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors">
                Shop
              </Link>
              {product.categories && product.categories.slug && (
                <>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Link
                    to={`/shop/${product.categories.slug}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {product.categories.name}
                  </Link>
                </>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-foreground font-medium truncate max-w-[300px]" aria-current="page">
                {product.name}
              </span>
            </nav>
          </div>
        </div>

        {/* Product Section */}
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="aspect-square overflow-hidden bg-card"
              >
                <img
                  src={imageError ? '/placeholder.svg' : (activeProduct?.image_url || '/placeholder.svg')}
                  alt={activeProduct?.name || product.name}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>

            {/* Product Info */}
            <div className="lg:py-4">
              {/* Title & Price */}
              <div className="mb-6">
                <p className="text-sm text-primary font-medium tracking-wider uppercase mb-2">
                  {product.categories?.name || product.category}
                </p>
                <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
                  {product.name}
                </h1>
                <p className="text-2xl font-medium text-foreground">
                  ₹ {totalPrice.toLocaleString()}
                </p>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Origin & Roast Level */}
              {(product.origin || product.roast_level) && (
                <div className="mb-6 p-4 bg-muted/30 border border-border/50">
                  <div className="flex flex-wrap gap-4 text-sm">
                    {product.origin && (
                      <div>
                        <span className="font-medium">Origin:</span>{' '}
                        <span className="text-muted-foreground">{product.origin}</span>
                      </div>
                    )}
                    {product.roast_level && (
                      <div>
                        <span className="font-medium">Roast:</span>{' '}
                        <span className="text-muted-foreground">{product.roast_level}</span>
                      </div>
                    )}
                    {product.intensity && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Intensity:</span>
                        <div className="flex gap-0.5 ml-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                'w-2 h-2 rounded-full',
                                i <= product.intensity! ? 'bg-primary' : 'bg-muted'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PIN Code Check */}
              <div className="mb-6 p-4 bg-muted/20 border border-border/50">
                {shippingInfo ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>Delivering to <strong>{shippingInfo.pincode}</strong></span>
                      <span className="text-muted-foreground">({shippingInfo.region})</span>
                    </div>
                    <button
                      onClick={() => setShowPincodeDialog(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPincodeDialog(true)}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <MapPin className="w-4 h-4" />
                    Check delivery availability
                  </button>
                )}
                {shippingInfo && !isSubscriptionSelected && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Shipping: ₹{getShippingCharge()}
                  </p>
                )}
                {isSubscriptionSelected && (
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    ✓ Free Shipping with Subscription
                  </p>
                )}
              </div>

              {/* Blend/Variant Selection (if product has child products) */}
              {hasChildProducts && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-foreground mb-3">Select Variant</p>
                  <div className="grid grid-cols-1 gap-3">
                    {childProducts.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => handleChildProductChange(child)}
                        className={cn(
                          "p-4 border text-left transition-all",
                          selectedChildProduct?.id === child.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="font-medium text-foreground">{child.name}</div>
                        {child.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {child.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase Type Toggle - Subscription Option */}
              {activeProduct?.subscription_eligible && (
                <div className="mb-6 p-4 border-2 border-primary/20 rounded-lg bg-gradient-to-br from-primary/5 to-transparent">
                  <p className="text-sm font-medium text-foreground mb-3">Choose Your Purchase Option</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setPurchaseType('one-time')}
                      className={cn(
                        "p-4 border-2 rounded-lg text-left transition-all",
                        purchaseType === 'one-time'
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="font-semibold">One-Time Purchase</span>
                      </div>
                      <p className="text-lg font-bold text-foreground">₹{currentPrice}</p>
                      <p className="text-xs text-muted-foreground">Standard shipping rates apply</p>
                    </button>
                    <button
                      onClick={() => {
                        if (!subscriptionPlanValid) {
                          const message =
                            subscriptionPlanError || "Subscription temporarily unavailable for this product";
                          toast.error(message);
                          return;
                        }
                        setPurchaseType('subscription');
                      }}
                      className={cn(
                        "p-4 border-2 rounded-lg text-left transition-all relative overflow-hidden",
                        purchaseType === 'subscription'
                          ? "border-primary bg-primary/10"
                          : "border-primary/50 hover:border-primary",
                        !subscriptionPlanValid && "opacity-60 cursor-not-allowed"
                      )}
                      disabled={!subscriptionPlanValid}
                    >
                      <div className="absolute top-0 right-0 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">
                        FREE SHIPPING
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <RefreshCw className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-primary">Subscribe</span>
                      </div>
                      <p className="text-lg font-bold text-primary">₹{currentPrice}</p>
                      <p className="text-xs text-muted-foreground">Monthly delivery + Free Shipping</p>
                    </button>
                  </div>
                  {activeProduct.subscription_eligible && !subscriptionPlanValid && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      <span>Subscription temporarily unavailable for this product.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Size/Weight Selection */}
              {variants.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-foreground mb-3">Size</p>
                  <div className="flex flex-wrap gap-3">
                    {variants
                      .sort((a, b) => a.weight - b.weight)
                      .map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedWeight(variant.weight)}
                          className={cn(
                            "px-4 py-2 border text-sm transition-all flex flex-col items-center",
                            selectedWeight === variant.weight
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span>
                            {variant.weight >= 1000 ? `${variant.weight / 1000} kg` : `${variant.weight} g`}
                          </span>
                          <span className="text-xs text-muted-foreground">₹{variant.price}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Quantity */}
                <div className="flex items-center border border-border">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <Button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant || (selectedVariant.stock_quantity ?? 0) <= 0}
                  className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90 tracking-wider uppercase text-sm font-medium"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {(selectedVariant?.stock_quantity ?? 0) > 0 
                    ? isSubscriptionSelected 
                      ? 'Subscribe Now' 
                      : 'Add to Cart'
                    : 'Out of Stock'
                  }
                </Button>
              </div>

              {/* Subscription Details - Show when subscription is selected */}
              {activeProduct?.subscription_eligible && purchaseType === 'subscription' && selectedVariant && (
                <div className="mb-6 p-4 border border-primary/30 rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-primary">Subscription Benefits</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Free Shipping on every delivery</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Delivered monthly, automatically</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Skip, pause, or cancel anytime</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span>Never run out of your favorite coffee</span>
                    </li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted-foreground">Monthly delivery</span>
                      <span className="text-lg font-bold text-primary">
                        ₹{currentPrice}/month
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="space-y-3 py-6 border-t border-border/50">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Free Shipping — Subscription Members Only</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Freshly roasted to order</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Sourced from Coorg, Karnataka since 1987</span>
                </div>
              </div>

              {/* Flavor Notes */}
              {product.flavor_notes && product.flavor_notes.length > 0 && (
                <div className="py-6 border-t border-border/50">
                  <p className="text-sm font-medium text-foreground mb-3">Flavor Notes</p>
                  <div className="flex flex-wrap gap-2">
                    {product.flavor_notes.map((note) => (
                      <span
                        key={note}
                        className="px-3 py-1 bg-muted text-muted-foreground text-xs tracking-wider"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-border/50 py-12 lg:py-16">
            <div className="container mx-auto px-4">
              <h2 className="font-serif text-2xl md:text-3xl font-semibold text-center mb-8">
                You May Also Like
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map((related) => {
                  const relatedLowestPrice = related.product_variants?.length > 0
                    ? Math.min(...related.product_variants.map(v => v.price))
                    : 0;

                  return (
                    <Link
                      key={related.id}
                      to={`/product/${related.slug}`}
                      className="group"
                    >
                      <div className="aspect-square overflow-hidden bg-card mb-3">
                        <img
                          src={related.image_url || '/placeholder.svg'}
                          alt={related.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors mb-1">
                        {related.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ₹ {relatedLowestPrice.toLocaleString()}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Pincode Dialog */}
        <PincodeDialog
          open={showPincodeDialog}
          onOpenChange={setShowPincodeDialog}
          onPincodeValidated={handlePincodeValidated}
        />
      </div>
  );
};

export default ProductDetail;