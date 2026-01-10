import { Link } from 'react-router-dom';
import { ArrowRight, Truck, RefreshCw, Award } from 'lucide-react';
import HeroVideo from '@/components/coffee/HeroVideo';
import ProductSectionCard from '@/components/coffee/ProductSectionCard';
import BestSellersCarousel from '@/components/coffee/BestSellersCarousel';
import CategoryGrid from '@/components/coffee/CategoryGrid';
import TestimonialsCarousel from '@/components/coffee/TestimonialsCarousel';
import StorySection from '@/components/coffee/StorySection';
import { goldBlendSection, specialtyBlendsSection, categoryCards } from '@/data/productSections';
import { mockTestimonials, mockProducts } from '@/data/mockData';
import heroVideo from '@/assets/videos/hero-coffee-brewing.mp4';
import coffeeBeans from '@/assets/coffee-beans-roasting.jpg';

// Transform mock products to best sellers format
const bestSellers = mockProducts.map(product => ({
  id: product.id,
  name: product.name,
  price: product.price,
  image: product.image_url,
  hoverImage: product.images && product.images[1] ? product.images[1] : undefined,
  href: `/shop/${product.slug}`,
  badge: product.is_featured ? 'Best Seller' : undefined,
}));

// Transform category cards for CategoryGrid
const categories = categoryCards.map(cat => ({
  id: cat.id,
  title: cat.title,
  image: cat.image,
  href: cat.link,
}));

// Transform testimonials for carousel
const testimonials = mockTestimonials.map(t => ({
  id: t.id,
  content: t.content,
  customerName: t.customer_name,
  location: t.location || '',
  rating: t.rating,
}));

export default function Homepage() {
  return (
    <div className="bg-background">
      {/* Hero Video Section */}
      <HeroVideo
        videoSrc={heroVideo}
        posterImage="https://images.pexels.com/photos/2074122/pexels-photo-2074122.jpeg"
        title="A SIP OF HOME"
        subtitle="Crafted with Tradition Since 1983"
        ctaText="Shop Now"
        ctaLink="/shop"
        secondaryCtaText="Our Story"
        secondaryCtaLink="/about"
        height="full"
        overlayOpacity={60}
      />

      {/* Features Bar */}
      <section className="features-bar py-6 border-y border-border/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-center gap-4 text-center md:text-left">
              <div className="feature-icon w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Free Shipping</p>
                <p className="text-sm text-muted-foreground">On orders over ₹999</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-center md:text-left">
              <div className="feature-icon w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Easy Returns</p>
                <p className="text-sm text-muted-foreground">30-day hassle-free returns</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-center md:text-left">
              <div className="feature-icon w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
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

      {/* Best Sellers Carousel */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <BestSellersCarousel
            products={bestSellers}
            title="Best Sellers"
            viewAllLink="/shop"
          />
        </div>
      </section>

      {/* Filter Coffee Blends Section */}
      <ProductSectionCard section={goldBlendSection} />

      {/* Shop by Category */}
      <section className="py-20 bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4">
          <CategoryGrid
            categories={categories}
            title="Shop by Category"
            columns={4}
          />
        </div>
      </section>

      {/* Specialty Blends Section */}
      <ProductSectionCard section={specialtyBlendsSection} reversed />

      {/* Story Section */}
      <StorySection
        title="Four Decades of Passion"
        subtitle="Our Heritage"
        content={[
          "Since 1983, Sharma Coffee Works has been crafting exceptional coffee in the misty hills of Coorg. Our journey began with a simple belief: great coffee comes from patience, tradition, and respect for the craft.",
          "Every bean is hand-selected from high-altitude estates, slow-roasted using traditional methods, and blended with the finest ghee-roasted chicory from Jamnagar."
        ]}
        image={coffeeBeans}
        ctaText="Learn More"
        ctaLink="/about"
        layout="right"
        theme="dark"
      />

      {/* Testimonials Carousel */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <TestimonialsCarousel
            testimonials={testimonials}
            title="What Our Customers Say"
            subtitle="Join thousands of coffee lovers"
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 overflow-hidden">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent" />
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/2074122/pexels-photo-2074122.jpeg')] bg-cover bg-center mix-blend-overlay opacity-20" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-6 tracking-tight">
            Experience the Taste of Coorg
          </h2>
          <p className="text-primary-foreground/80 mb-12 max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
            Join thousands of coffee lovers who've made the switch to freshly roasted,
            traditionally crafted coffee from the hills of Coorg.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-3 bg-background text-foreground font-medium tracking-[0.15em] uppercase text-sm px-12 py-5 hover:bg-foreground hover:text-background transition-all duration-300 group"
          >
            <span>Shop Now</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </div>
  );
}
