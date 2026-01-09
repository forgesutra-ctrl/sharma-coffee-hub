import { Link } from 'react-router-dom';
import { ArrowRight, Truck, RefreshCw, Award, Star } from 'lucide-react';
import HeroVideo from '@/components/coffee/HeroVideo';
import ProductSectionCard from '@/components/coffee/ProductSectionCard';
import { filterCoffeeSection, specialtyBlendsSection, categoryCards } from '@/data/productSections';
import { mockTestimonials } from '@/data/mockData';

export default function Homepage() {
  return (
    <div className="bg-background">
      {/* Hero Video Section */}
      <HeroVideo
        posterImage="https://images.pexels.com/photos/2074122/pexels-photo-2074122.jpeg"
        videoSrc="https://videos.pexels.com/video-files/5520810/5520810-hd_1920_1080_30fps.mp4"
        title="A SIP OF HOME"
        subtitle="A Taste of Nostalgia"
        ctaText="Shop Now"
        ctaLink="/shop"
        secondaryCtaText="Our Story"
        secondaryCtaLink="/about"
        height="full"
        overlayOpacity={65}
      />

      {/* Features Bar */}
      <section className="bg-secondary py-8 border-y border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center justify-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Free Shipping</p>
                <p className="text-sm text-muted-foreground">On orders over ₹999</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Easy Returns</p>
                <p className="text-sm text-muted-foreground">30-day hassle-free returns</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Premium Quality</p>
                <p className="text-sm text-muted-foreground">Since 1983</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Coffee Blends Section */}
      <ProductSectionCard section={filterCoffeeSection} />

      {/* Shop by Category */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-3">
              Explore
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-semibold">
              Shop by Category
            </h2>
            <div className="section-divider mt-6" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoryCards.map((category, index) => (
              <Link
                key={category.id}
                to={category.link}
                className="category-card group aspect-[3/4] relative rounded-sm overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <img
                  src={category.image}
                  alt={category.title}
                  className="category-image absolute inset-0 w-full h-full object-cover"
                />
                <div className="category-overlay" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
                  <h3 className="font-display text-xl font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    Shop Now
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Specialty Blends Section */}
      <ProductSectionCard section={specialtyBlendsSection} reversed />

      {/* Story Section */}
      <section className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-[4/5] overflow-hidden rounded-sm image-shine">
                <img
                  src="https://images.pexels.com/photos/4349761/pexels-photo-4349761.jpeg"
                  alt="Coffee roasting"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/20 rounded-sm -z-10" />
            </div>
            <div>
              <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-4">
                Our Heritage
              </p>
              <h2 className="font-display text-4xl md:text-5xl font-semibold mb-6">
                Four Decades of Passion
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Since 1983, Sharma Coffee Works has been crafting exceptional coffee in the misty hills of Coorg. 
                  Our journey began with a simple belief: great coffee comes from patience, tradition, and respect for the craft.
                </p>
                <p>
                  Every bean is hand-selected from high-altitude estates, slow-roasted using traditional methods, 
                  and blended with the finest ghee-roasted chicory from Jamnagar.
                </p>
              </div>
              <Link to="/about" className="btn-premium mt-8 inline-flex items-center gap-2">
                Learn More
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-3">
              Testimonials
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-semibold">
              What Our Customers Say
            </h2>
            <div className="section-divider mt-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mockTestimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-card p-8 border border-border hover:border-primary/30 transition-all duration-300 rounded-sm"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-foreground/90 mb-6 leading-relaxed text-lg italic font-display">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-display font-bold text-lg">
                      {testimonial.customer_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.customer_name}</p>
                    {testimonial.location && (
                      <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-primary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-primary-foreground mb-6">
            Experience the Taste of Coorg
          </h2>
          <p className="text-primary-foreground/80 mb-10 max-w-2xl mx-auto text-lg">
            Join thousands of coffee lovers who've made the switch to freshly roasted,
            traditionally crafted coffee from the hills of Coorg.
          </p>
          <Link
            to="/shop"
            className="inline-block bg-background text-foreground font-medium tracking-[0.15em] uppercase text-sm px-12 py-4 hover:bg-foreground hover:text-background transition-all duration-300"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </div>
  );
}
