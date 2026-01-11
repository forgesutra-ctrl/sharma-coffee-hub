import { useState } from 'react';
import { Plus, Minus, ShoppingBag, Coffee, Leaf, Package, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import type { ProductSection, ProductVariant } from '@/data/productSections';
import type { Product, CartItem } from '@/types';

interface OtherProductsSectionProps {
  section: ProductSection;
}

// Sub-category definitions (no tea - tea has its own section now)
const subCategories = [
  { id: 'all', name: 'All Products', icon: Package },
  { id: 'coffee-based', name: 'Coffee-Based', icon: Coffee, productIds: ['coffee-chocolate', 'coffee-soap', 'coffee-oasis', 'coffee-wine'] },
  { id: 'natural', name: 'Natural Products', icon: Leaf, productIds: ['coorg-honey', 'organic-turmeric', 'coffee-jams'] },
  { id: 'equipment', name: 'Equipment', icon: Wrench, productIds: ['filter-set', 'percolator'] },
];

export default function OtherProductsSection({ section }: OtherProductsSectionProps) {
  const { addToCart } = useCart();
  const [activeCategory, setActiveCategory] = useState('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const getQuantity = (id: string) => quantities[id] || 1;
  const setQuantity = (id: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, qty) }));
  };

  const filteredVariants = activeCategory === 'all'
    ? section.variants
    : section.variants.filter(v => {
        const category = subCategories.find(c => c.id === activeCategory);
        return category?.productIds?.includes(v.id);
      });

  const handleAddToCart = (variant: ProductVariant) => {
    const product: Product = {
      id: variant.id,
      name: variant.name,
      slug: section.slug,
      description: variant.description,
      short_description: variant.description.substring(0, 100),
      price: variant.price,
      image_url: variant.image,
      images: variant.images || [variant.image],
      roast_level: 'Medium',
      has_chicory: false,
      origin: variant.origin || 'Coorg, Karnataka',
      flavor_notes: variant.flavorNotes,
      available_weights: [],
      brewing_methods: [],
      storage_tips: '',
      is_featured: true,
      in_stock: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const cartItem: CartItem = {
      product,
      weight: 0,
      quantity: getQuantity(variant.id),
      variant_id: variant.id,
    };

    addToCart(cartItem);
    toast.success(`${variant.name} added to cart`);
  };

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          {section.subtitle && (
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-2">
              {section.subtitle}
            </p>
          )}
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">
            {section.title}
          </h2>
          <div className="section-divider mb-6" />
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {section.description}
          </p>
        </div>

        {/* Sub-category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {subCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all',
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVariants.map((variant) => (
            <div
              key={variant.id}
              className="group bg-card border border-border rounded-sm overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              {/* Image */}
              <div className="aspect-square overflow-hidden relative">
                <img
                  src={variant.image}
                  alt={variant.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {variant.flavorNotes.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                    {variant.flavorNotes.slice(0, 2).map((note) => (
                      <span
                        key={note}
                        className="px-2 py-0.5 bg-background/90 backdrop-blur-sm text-xs rounded-sm"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-display text-lg font-semibold line-clamp-1">
                    {variant.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {variant.description}
                  </p>
                </div>

                {/* Price */}
                <div className="text-xl font-display font-bold text-primary">
                  ₹{variant.price}
                </div>

                {/* Quantity & Add to Cart */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-border rounded-sm">
                    <button
                      className="p-1.5 hover:bg-muted transition-colors"
                      onClick={() => setQuantity(variant.id, getQuantity(variant.id) - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">
                      {getQuantity(variant.id)}
                    </span>
                    <button
                      className="p-1.5 hover:bg-muted transition-colors"
                      onClick={() => setQuantity(variant.id, getQuantity(variant.id) + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <Button
                    onClick={() => handleAddToCart(variant)}
                    className="flex-1 btn-premium-solid text-sm"
                    size="sm"
                  >
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredVariants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found in this category.</p>
          </div>
        )}
      </div>
    </section>
  );
}