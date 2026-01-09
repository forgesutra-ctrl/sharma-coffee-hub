import { useState, useEffect } from 'react';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import type { ProductSection, ProductVariant, PackSize, GrindOption } from '@/data/productSections';
import type { Product, CartItem } from '@/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ProductSectionCardProps {
  section: ProductSection;
  reversed?: boolean;
}

export default function ProductSectionCard({ section, reversed = false }: ProductSectionCardProps) {
  const { addToCart } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(section.variants[0]);
  const [selectedPackSize, setSelectedPackSize] = useState<PackSize | null>(
    section.packSizes.length > 0 ? section.packSizes[0] : null
  );
  const [selectedGrind, setSelectedGrind] = useState<GrindOption | null>(
    section.grindOptions.length > 0 ? section.grindOptions[0] : null
  );
  const [quantity, setQuantity] = useState(1);

  // Update variant when section changes
  useEffect(() => {
    setSelectedVariant(section.variants[0]);
    setSelectedPackSize(section.packSizes.length > 0 ? section.packSizes[0] : null);
    setSelectedGrind(section.grindOptions.length > 0 ? section.grindOptions[0] : null);
    setQuantity(1);
  }, [section]);

  // Calculate final price
  const calculatePrice = () => {
    let price = selectedVariant.price;
    if (selectedPackSize) {
      price += selectedPackSize.price;
    }
    return price;
  };

  const handleAddToCart = () => {
    // Create a Product object to match the CartItem interface
    const product: Product = {
      id: selectedVariant.id,
      name: selectedVariant.name,
      slug: section.slug,
      description: selectedVariant.description,
      short_description: selectedVariant.description.substring(0, 100),
      price: calculatePrice(),
      image_url: selectedVariant.image,
      images: selectedVariant.images || [selectedVariant.image],
      roast_level: (selectedVariant.roastLevel as 'Light' | 'Medium' | 'Dark') || 'Medium',
      has_chicory: (selectedVariant.chicoryPercent || 0) > 0,
      origin: selectedVariant.origin || 'Coorg, Karnataka',
      flavor_notes: selectedVariant.flavorNotes,
      available_grinds: section.grindOptions.map(g => g.name),
      available_weights: section.packSizes.map(p => p.weight),
      brewing_methods: section.brewingMethods || [],
      storage_tips: section.storageTips || '',
      is_featured: true,
      in_stock: true,
      sort_order: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const cartItem: CartItem = {
      product,
      grind_type: selectedGrind?.name || 'Whole Bean',
      weight: selectedPackSize?.weight || 250,
      quantity,
      variant_id: selectedVariant.id,
    };

    addToCart(cartItem);
    toast.success(`${selectedVariant.name} added to cart`);
  };

  // Intensity dots
  const renderIntensity = (intensity?: number) => {
    if (!intensity) return null;
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-2">Intensity:</span>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full',
              i <= intensity ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>
    );
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

        {/* Product Content */}
        <div className={cn(
          'grid lg:grid-cols-2 gap-8 lg:gap-16 items-start',
          reversed && 'lg:flex-row-reverse'
        )}>
          {/* Image Side */}
          <div className={cn('relative', reversed && 'lg:order-2')}>
            <div className="aspect-square overflow-hidden rounded-sm image-shine">
              <img
                src={selectedVariant.image}
                alt={selectedVariant.name}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
            {/* Flavor Notes */}
            {selectedVariant.flavorNotes.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                {selectedVariant.flavorNotes.map((note) => (
                  <span
                    key={note}
                    className="px-3 py-1 bg-background/90 backdrop-blur-sm text-xs font-medium rounded-sm"
                  >
                    {note}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Details Side */}
          <div className={cn('space-y-6', reversed && 'lg:order-1')}>
            {/* Variant Selector */}
            {section.variants.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-3">Select Blend</label>
                <div className="grid grid-cols-1 gap-2">
                  {section.variants.map((variant) => (
                    <button
                      key={variant.id}
                      className={cn(
                        'variant-option text-left flex items-center justify-between',
                        selectedVariant.id === variant.id && 'selected'
                      )}
                      onClick={() => setSelectedVariant(variant)}
                    >
                      <div>
                        <p className="font-medium">{variant.name}</p>
                        {variant.chicoryPercent !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {variant.chicoryPercent > 0 ? `${variant.chicoryPercent}% Chicory` : 'No Chicory'}
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-primary">₹{variant.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Variant Details */}
            <div className="p-4 bg-muted/50 rounded-sm">
              <h3 className="font-display text-xl font-semibold mb-2">{selectedVariant.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{selectedVariant.description}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                {selectedVariant.origin && (
                  <span><strong>Origin:</strong> {selectedVariant.origin}</span>
                )}
                {selectedVariant.roastLevel && (
                  <span><strong>Roast:</strong> {selectedVariant.roastLevel}</span>
                )}
              </div>
              <div className="mt-3">
                {renderIntensity(selectedVariant.intensity)}
              </div>
            </div>

            {/* Pack Size Selector */}
            {section.packSizes.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-3">Pack Size</label>
                <div className="flex flex-wrap gap-2">
                  {section.packSizes.map((size) => (
                    <button
                      key={size.weight}
                      className={cn(
                        'variant-option',
                        selectedPackSize?.weight === size.weight && 'selected'
                      )}
                      onClick={() => setSelectedPackSize(size)}
                    >
                      {size.weight}g
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grind Selector */}
            {section.grindOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-3">Grind Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {section.grindOptions.map((grind) => (
                    <button
                      key={grind.id}
                      className={cn(
                        'variant-option text-left',
                        selectedGrind?.id === grind.id && 'selected'
                      )}
                      onClick={() => setSelectedGrind(grind)}
                    >
                      <p className="font-medium text-sm">{grind.name}</p>
                      {grind.description && (
                        <p className="text-xs text-muted-foreground">{grind.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price & Add to Cart */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <span className="text-3xl font-display font-bold text-primary">
                  ₹{calculatePrice()}
                </span>
                {selectedVariant.comparePrice && (
                  <span className="ml-2 text-lg text-muted-foreground line-through">
                    ₹{selectedVariant.comparePrice + (selectedPackSize?.price || 0)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Quantity */}
                <div className="flex items-center border border-border rounded-sm">
                  <button
                    className="p-2 hover:bg-muted transition-colors"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-medium">{quantity}</span>
                  <button
                    className="p-2 hover:bg-muted transition-colors"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <Button onClick={handleAddToCart} className="btn-premium-solid flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Add to Cart
                </Button>
              </div>
            </div>

            {/* Additional Info Accordion */}
            <Accordion type="single" collapsible className="w-full">
              {section.brewingMethods && section.brewingMethods.length > 0 && (
                <AccordionItem value="brewing">
                  <AccordionTrigger className="text-sm">Brewing Methods</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-wrap gap-2">
                      {section.brewingMethods.map((method) => (
                        <span key={method} className="px-3 py-1 bg-muted text-xs rounded-sm">
                          {method}
                        </span>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
              {section.ingredients && (
                <AccordionItem value="ingredients">
                  <AccordionTrigger className="text-sm">Ingredients</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {section.ingredients}
                  </AccordionContent>
                </AccordionItem>
              )}
              {section.storageTips && (
                <AccordionItem value="storage">
                  <AccordionTrigger className="text-sm">Storage Tips</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {section.storageTips}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
