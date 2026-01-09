import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, RefreshCw, Award, Star, Coffee } from 'lucide-react';
import { mockTestimonials, mockProducts } from '../data/mockData';
import ProductCard from '../components/coffee/ProductCard';
import { useCart } from '../context/CartContext';
import { Product } from '../types';
import HeroVideo from '../components/coffee/HeroVideo';
import StorySection from '../components/coffee/StorySection';

const Homepage: React.FC = () => {
  const testimonials = mockTestimonials;
  const { addToCart } = useCart();

  const handleQuickAdd = (product: Product) => {
    addToCart({
      product,
      grind_type: product.available_grinds?.[0] || 'Coffee Powder',
      weight: product.available_weights?.[0] || 250,
      quantity: 1,
    });
  };

  return (
    <div className="bg-background">
      {/* Hero Video Section */}
      <HeroVideo
        fallbackImageSrc="https://images.pexels.com/photos/2074122/pexels-photo-2074122.jpeg"
        title="A SIP OF HOME"
        subtitle="A TASTE OF NOSTALGIA"
        ctaText="Shop Now"
        ctaLink="/shop"
        secondaryCta={{
          text: 'Our Story',
          link: '/about'
        }}
        height="full"
        overlayOpacity={60}
      />

      {/* Features Bar */}
      <section className="bg-secondary py-6 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <Truck className="w-6 h-6 text-gold" />
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Free Shipping</p>
                <p className="text-xs text-muted-foreground">On orders over ₹500</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 text-gold" />
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Easy Returns</p>
                <p className="text-xs text-muted-foreground">30-day hassle-free returns</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Award className="w-6 h-6 text-gold" />
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Premium Quality</p>
                <p className="text-xs text-muted-foreground">Since 1987</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-4">
            <div>
              <span className="text-gold text-sm font-semibold tracking-widest uppercase">Bestsellers</span>
              <h2 className="font-serif text-4xl sm:text-5xl text-foreground mt-2">Featured Products</h2>
            </div>
            <Link to="/shop" className="group text-gold font-medium flex items-center gap-2 hover:gap-4 transition-all uppercase text-sm tracking-wider">
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockProducts.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleQuickAdd}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <StorySection
        title="Four Decades of Passion"
        subtitle="Our Story"
        content={[
          "Since 1987, Sharma Coffee Works has been crafting exceptional coffee in the misty hills of Coorg. Our journey began with a simple belief: great coffee comes from patience, tradition, and respect for the craft.",
          "Every bean is hand-selected from high-altitude estates, slow-roasted using traditional methods, and blended with the finest ghee-roasted chicory from Jamnagar."
        ]}
        image="https://images.pexels.com/photos/4349761/pexels-photo-4349761.jpeg"
        ctaText="Learn More"
        ctaLink="/about"
        layout="left"
      />

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-gold text-sm font-semibold tracking-widest uppercase">Testimonials</span>
              <h2 className="font-serif text-4xl sm:text-5xl text-foreground mt-2">What Our Customers Say</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="bg-card p-8 border border-border hover:border-gold/30 transition-colors duration-300"
                >
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="text-foreground/90 mb-6 leading-relaxed text-lg italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                      <span className="text-gold font-semibold text-lg">
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
      )}

      {/* Final CTA */}
      <section className="py-20 bg-gold">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl text-coffee-foreground mb-4">
            Experience the Taste of Coorg
          </h2>
          <p className="text-coffee-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of coffee lovers who've made the switch to freshly roasted,
            traditionally crafted coffee from the hills of Coorg.
          </p>
          <Link
            to="/shop"
            className="inline-block bg-background text-foreground font-medium tracking-wide uppercase text-sm px-10 py-4 hover:bg-secondary transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Homepage;
