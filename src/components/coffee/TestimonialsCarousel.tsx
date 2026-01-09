import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import useEmblaCarousel from 'embla-carousel-react';

interface Testimonial {
  id: string;
  content: string;
  customerName: string;
  location?: string;
  rating: number;
  image?: string;
}

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
}

export default function TestimonialsCarousel({
  testimonials,
  title = 'What Our Customers Say',
  subtitle = 'Testimonials',
}: TestimonialsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'center',
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  // Auto-scroll
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <section className="py-24 bg-secondary">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-primary text-sm font-medium tracking-[0.3em] uppercase mb-4">
            {subtitle}
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground">
            {title}
          </h2>
          <div className="section-divider mt-6" />
        </div>

        {/* Carousel */}
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 px-3"
                >
                  <div className={cn(
                    'testimonial-card h-full rounded-sm transition-all duration-500',
                    selectedIndex === index ? 'border-primary/40' : 'border-border/30'
                  )}>
                    {/* Rating */}
                    <div className="flex gap-1 mb-6 relative z-10">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-4 h-4',
                            i < testimonial.rating
                              ? 'fill-primary text-primary'
                              : 'text-muted'
                          )}
                        />
                      ))}
                    </div>

                    {/* Content */}
                    <p className="text-foreground/90 leading-relaxed text-lg font-display italic mb-8 relative z-10">
                      {testimonial.content}
                    </p>

                    {/* Customer */}
                    <div className="flex items-center gap-4 relative z-10">
                      {testimonial.image ? (
                        <img
                          src={testimonial.image}
                          alt={testimonial.customerName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-display font-bold text-lg">
                            {testimonial.customerName.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground">
                          {testimonial.customerName}
                        </p>
                        {testimonial.location && (
                          <p className="text-sm text-muted-foreground">
                            {testimonial.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 p-3 bg-card border border-border rounded-full hover:border-primary hover:text-primary transition-all duration-300 hidden lg:flex items-center justify-center"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 p-3 bg-card border border-border rounded-full hover:border-primary hover:text-primary transition-all duration-300 hidden lg:flex items-center justify-center"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                selectedIndex === index
                  ? 'bg-primary w-8'
                  : 'bg-muted hover:bg-muted-foreground'
              )}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}