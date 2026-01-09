import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  hoverImage?: string;
  href: string;
  badge?: string;
}

interface BestSellersCarouselProps {
  products: Product[];
  title?: string;
  viewAllLink?: string;
}

export default function BestSellersCarousel({
  products,
  title = 'Best Sellers',
  viewAllLink = '/shop',
}: BestSellersCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    slidesToScroll: 1,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground">
              {title}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <Link 
              to={viewAllLink} 
              className="hidden sm:flex items-center gap-2 text-sm font-medium tracking-[0.15em] uppercase text-primary hover:text-accent transition-colors group"
            >
              View all
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <div className="flex gap-2">
              <button
                onClick={scrollPrev}
                disabled={!canScrollPrev}
                className={cn(
                  'p-3 border border-border rounded-sm transition-all duration-300',
                  canScrollPrev 
                    ? 'hover:border-primary hover:text-primary' 
                    : 'opacity-40 cursor-not-allowed'
                )}
                aria-label="Previous products"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={scrollNext}
                disabled={!canScrollNext}
                className={cn(
                  'p-3 border border-border rounded-sm transition-all duration-300',
                  canScrollNext 
                    ? 'hover:border-primary hover:text-primary' 
                    : 'opacity-40 cursor-not-allowed'
                )}
                aria-label="Next products"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {products.map((product, index) => (
              <div 
                key={product.id}
                className="flex-[0_0_80%] sm:flex-[0_0_45%] md:flex-[0_0_30%] lg:flex-[0_0_23%] min-w-0"
              >
                <Link to={product.href} className="group block">
                  <div className="product-card relative aspect-square overflow-hidden rounded-sm mb-4">
                    {/* Primary Image */}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="product-image product-image-primary absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Hover Image */}
                    {product.hoverImage && (
                      <img
                        src={product.hoverImage}
                        alt={`${product.name} alternate view`}
                        className="product-image product-image-swap absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Badge */}
                    {product.badge && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium tracking-wider uppercase rounded-sm">
                        {product.badge}
                      </div>
                    )}

                    {/* View Product Overlay */}
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                      <span className="text-sm font-medium tracking-[0.2em] uppercase text-foreground">
                        View Product
                      </span>
                    </div>
                  </div>

                  <h3 className="font-display text-lg text-foreground group-hover:text-primary transition-colors mb-1">
                    {product.name}
                  </h3>
                  <p className="text-primary font-medium">
                    ₹ {product.price.toLocaleString()}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile View All */}
        <div className="mt-8 text-center sm:hidden">
          <Link 
            to={viewAllLink} 
            className="inline-flex items-center gap-2 text-sm font-medium tracking-[0.15em] uppercase text-primary hover:text-accent transition-colors"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}