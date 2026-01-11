import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Minus, Plus, ShoppingBag, Check, Loader2 } from 'lucide-react';
import Layout from '@/components/coffee/Layout';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Product } from '@/types';
import { useProducts, DatabaseProduct } from '@/hooks/useProducts';

const ProductDetail = () => {
  const { slug } = useParams<{ slug?: string; categorySlug?: string; productId?: string }>();
  const { addToCart } = useCart();

  const { data: products, isLoading, error } = useProducts();

  // Find the product by slug
  const product = products?.find(p => p.slug === slug);
  const variants = product?.product_variants || [];

  const [selectedWeight, setSelectedWeight] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [imageError, setImageError] = useState(false);

  // Set default selected weight when product loads
  if (product && variants.length > 0 && selectedWeight === null) {
    // Default to 500g if available, otherwise first variant
    const defaultVariant = variants.find(v => v.weight === 500) || variants[0];
    setSelectedWeight(defaultVariant.weight);
  }

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-2xl mb-4">Error loading product</h1>
            <Link to="/shop" className="text-primary hover:underline">
              Return to shop
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Product not found
  if (!product) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-2xl mb-4">Product not found</h1>
            <Link to="/shop" className="text-primary hover:underline">
              Return to shop
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Get selected variant
  const selectedVariant = variants.find(v => v.weight === selectedWeight) || variants[0];
  const currentPrice = selectedVariant?.price || 0;
  const totalPrice = currentPrice * quantity;

  // Get related products from same category
  const relatedProducts = products
    ?.filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4) || [];

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    const cartProduct: Product = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      short_description: (product.description || '').slice(0, 100),
      price: currentPrice,
      image_url: product.image_url || '/placeholder.svg',
      images: [product.image_url || '/placeholder.svg'],
      roast_level: (product.roast_level as 'Light' | 'Medium' | 'Dark') || 'Medium',
      has_chicory: false,
      origin: product.origin || 'Coorg, Karnataka',
      flavor_notes: product.flavor_notes || [],
      available_weights: variants.map(v => v.weight),
      brewing_methods: [],
      storage_tips: '',
      is_featured: product.is_featured || false,
      in_stock: (selectedVariant.stock_quantity ?? 0) > 0,
      sort_order: 0,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };

    addToCart({
      product: cartProduct,
      weight: selectedWeight || 250,
      quantity,
      variant_id: selectedVariant.id,
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Announcement Bar */}
        <div className="bg-primary text-primary-foreground py-2.5 text-center text-xs font-medium tracking-[0.2em] uppercase">
          Free Shipping On all orders over ₹499
        </div>

        {/* Breadcrumb */}
        <div className="border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center gap-2 text-sm flex-wrap">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors">
                Shop
              </Link>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Link 
                to={`/shop?category=${encodeURIComponent(product.category.toLowerCase().replace(/\s+/g, '-'))}`} 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {product.category}
              </Link>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{product.name}</span>
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
                  src={imageError ? '/placeholder.svg' : (product.image_url || '/placeholder.svg')}
                  alt={product.name}
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
                  {product.category}
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
                  {(selectedVariant?.stock_quantity ?? 0) > 0 ? 'Add to Cart' : 'Out of Stock'}
                </Button>
              </div>

              {/* Features */}
              <div className="space-y-3 py-6 border-t border-border/50">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Free shipping on orders over ₹499</span>
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
                      to={`/shop/${related.slug}`}
                      className="group"
                    >
                      <div className="aspect-square overflow-hidden bg-card mb-4">
                        <img
                          src={related.image_url || '/placeholder.svg'}
                          alt={related.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <h3 className="font-serif text-sm md:text-base text-center group-hover:text-primary transition-colors line-clamp-2">
                        {related.name}
                      </h3>
                      <p className="text-sm text-muted-foreground text-center mt-1">
                        from ₹ {relatedLowestPrice.toLocaleString()}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetail;
