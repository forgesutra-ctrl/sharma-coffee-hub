import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Minus, Plus, ShoppingBag, Check } from 'lucide-react';
import Layout from '@/components/coffee/Layout';
import { allProductSections } from '@/data/productSections';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Product } from '@/types';

const ProductDetail = () => {
  const { categorySlug, productId } = useParams<{ categorySlug: string; productId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  // Find the product section and variant
  const section = allProductSections.find(s => s.slug === categorySlug);
  const variant = section?.variants.find(v => v.id === productId);

  const [selectedWeight, setSelectedWeight] = useState<number>(500);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // If product not found
  if (!section || !variant) {
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

  // Get pack sizes and calculate price
  const packSizes = section.packSizes.length > 0 
    ? section.packSizes 
    : [{ weight: 250, price: variant.price * 0.25 }, { weight: 500, price: variant.price * 0.5 }, { weight: 1000, price: variant.price }];
  
  const selectedPackSize = packSizes.find(ps => ps.weight === selectedWeight) || packSizes[0];
  const calculatedPrice = selectedPackSize.price;
  const totalPrice = calculatedPrice * quantity;

  // Get all images
  const images = variant.images && variant.images.length > 0 
    ? [variant.image, ...variant.images] 
    : [variant.image];

  const handleAddToCart = () => {
    const product: Product = {
      id: variant.id,
      name: variant.name,
      slug: section.slug,
      description: variant.description,
      short_description: variant.description.slice(0, 100),
      price: calculatedPrice,
      image_url: variant.image,
      images: images,
      roast_level: (variant.roastLevel as 'Light' | 'Medium' | 'Dark') || 'Medium',
      has_chicory: (variant.chicoryPercent || 0) > 0,
      origin: variant.origin || 'Coorg, Karnataka',
      flavor_notes: variant.flavorNotes,
      available_weights: packSizes.map(ps => ps.weight),
      brewing_methods: section.brewingMethods || [],
      storage_tips: section.storageTips || '',
      is_featured: false,
      in_stock: true,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addToCart({
      product,
      weight: selectedWeight,
      quantity,
    });
    toast.success(`${variant.name} added to cart`);
  };

  // Related products from same category
  const relatedProducts = section.variants
    .filter(v => v.id !== variant.id)
    .slice(0, 4);

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Announcement Bar */}
        <div className="bg-primary text-primary-foreground py-2.5 text-center text-xs font-medium tracking-[0.2em] uppercase">
          Free Shipping On all orders over ₹1000
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
                Collections
              </Link>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Link to={`/shop/${section.slug}`} className="text-muted-foreground hover:text-primary transition-colors">
                {section.title}
              </Link>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{variant.name}</span>
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
                key={selectedImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="aspect-square overflow-hidden bg-card"
              >
                <img
                  src={images[selectedImageIndex]}
                  alt={variant.name}
                  className="w-full h-full object-cover"
                />
              </motion.div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-3">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={cn(
                        "w-20 h-20 overflow-hidden border-2 transition-all",
                        selectedImageIndex === idx
                          ? "border-primary"
                          : "border-transparent hover:border-border"
                      )}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="lg:py-4">
              {/* Title & Price */}
              <div className="mb-6">
                <p className="text-sm text-primary font-medium tracking-wider uppercase mb-2">
                  {section.title}
                </p>
                <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground mb-4">
                  {variant.name}
                </h1>
                <p className="text-2xl font-medium text-foreground">
                  ₹ {totalPrice.toFixed(2)}
                </p>
              </div>

              {/* Description */}
              <p className="text-muted-foreground mb-8 leading-relaxed">
                {variant.description}
              </p>

              {/* Blend Info */}
              {(variant.arabicaPercent !== undefined || variant.robustaPercent !== undefined || variant.chicoryPercent !== undefined) && (
                <div className="mb-6 p-4 bg-muted/30 border border-border/50">
                  <p className="text-sm font-medium text-foreground mb-2">Blend Composition</p>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {variant.arabicaPercent !== undefined && variant.arabicaPercent > 0 && (
                      <span>Arabica {variant.arabicaPercent}%</span>
                    )}
                    {variant.robustaPercent !== undefined && variant.robustaPercent > 0 && (
                      <span>• Robusta {variant.robustaPercent}%</span>
                    )}
                    {variant.chicoryPercent !== undefined && variant.chicoryPercent > 0 && (
                      <span>• Chicory {variant.chicoryPercent}%</span>
                    )}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {packSizes.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-foreground mb-3">Size</p>
                  <div className="flex flex-wrap gap-3">
                    {packSizes.map((size) => (
                      <button
                        key={size.weight}
                        onClick={() => setSelectedWeight(size.weight)}
                        className={cn(
                          "px-4 py-2 border text-sm transition-all",
                          selectedWeight === size.weight
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {size.weight >= 1000 ? `${size.weight / 1000} kg` : `${size.weight} g`}
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
                  className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90 tracking-wider uppercase text-sm font-medium"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>

              {/* Features */}
              <div className="space-y-3 py-6 border-t border-border/50">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Free shipping on orders over ₹1000</span>
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
              {variant.flavorNotes && variant.flavorNotes.length > 0 && (
                <div className="py-6 border-t border-border/50">
                  <p className="text-sm font-medium text-foreground mb-3">Flavor Notes</p>
                  <div className="flex flex-wrap gap-2">
                    {variant.flavorNotes.map((note) => (
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

              {/* Brewing Methods */}
              {section.brewingMethods && section.brewingMethods.length > 0 && (
                <div className="py-6 border-t border-border/50">
                  <p className="text-sm font-medium text-foreground mb-3">Recommended Brewing Methods</p>
                  <div className="flex flex-wrap gap-2">
                    {section.brewingMethods.map((method) => (
                      <span
                        key={method}
                        className="px-3 py-1 bg-muted text-muted-foreground text-xs tracking-wider"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Storage Tips */}
              {section.storageTips && (
                <div className="py-6 border-t border-border/50">
                  <p className="text-sm font-medium text-foreground mb-2">Storage Tips</p>
                  <p className="text-sm text-muted-foreground">{section.storageTips}</p>
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
                {relatedProducts.map((related) => (
                  <Link
                    key={related.id}
                    to={`/product/${section.slug}/${related.id}`}
                    className="group"
                  >
                    <div className="aspect-square overflow-hidden bg-card mb-4">
                      <img
                        src={related.image}
                        alt={related.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <h3 className="font-serif text-sm md:text-base text-center group-hover:text-primary transition-colors line-clamp-2">
                      {related.name}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center mt-1">
                      from ₹ {related.price.toFixed(2)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetail;
