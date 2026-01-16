import { Link } from 'react-router-dom';
import { ArrowRight, Truck, RefreshCw, Award, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import HeroVideo from '@/components/coffee/HeroVideo';
import BestSellersCarousel from '@/components/coffee/BestSellersCarousel';
import CategoryGrid from '@/components/coffee/CategoryGrid';
import StorySection from '@/components/coffee/StorySection';
import InstagramFeed from '@/components/coffee/InstagramFeed';
import AmbientSound from '@/components/coffee/AmbientSound';
import heroVideo from '@/assets/videos/hero-coffee-brewing.mp4';
import coffeePlantImg from '@/assets/chatgpt_image_jan_12,_2026,_10_25_34_am copy.jpeg';
import { useFeaturedProducts, useProducts } from '@/hooks/useProducts';
import { useCategoriesWithCount } from '@/hooks/useCategories';

export default function Homepage() {
  const { data: featuredProducts, isLoading: loadingFeatured } = useFeaturedProducts();
  const { data: allProducts } = useProducts();
  const { data: dbCategories, isLoading: loadingCategories } = useCategoriesWithCount();

  // Load Google Reviews widget script
  useEffect(() => {
    const existingScript = document.querySelector('script[src*="google-reviews/widget.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://widgets.sociablekit.com/google-reviews/widget.js';
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  // Transform featured products for BestSellersCarousel
  const bestSellers = featuredProducts?.map(product => ({
    id: product.productId,
    name: product.name,
    price: product.price,
    image: product.image,
    hoverImage: undefined,
    href: `/product/${product.slug}`,
    badge: product.isFeatured ? 'Best Seller' : undefined,
  })) || [];

  // Transform categories for CategoryGrid
  const categories = dbCategories?.filter(cat => cat.product_count && cat.product_count > 0)
    .slice(0, 6)
    .map(cat => {
      const categoryProduct = allProducts?.find(p => p.category_id === cat.id);
      return {
        id: cat.id,
        title: cat.name,
        image: categoryProduct?.image_url || '/placeholder.svg',
        href: `/shop/${cat.slug}`,
      };
    }) || [];

  return (
    <div className="bg-background">
      {/* Hero Video Section */}
      <HeroVideo
        videoSrc={heroVideo}
        posterImage="https://images.pexels.com/photos/2074122/pexels-photo-2074122.jpeg"
        title="A SIP OF HOME"
        subtitle="Crafted with Tradition Since 1987"
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
                <p className="text-sm text-muted-foreground">Subscription Members Only</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-center md:text-left">
              <div className="feature-icon w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Easy Returns</p>
                <p className="text-sm text-muted-foreground">7-day hassle-free returns</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 text-center md:text-left">
              <div className="feature-icon w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Premium Quality</p>
                <p className="text-sm text-muted-foreground">Since 1987</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Best Sellers Carousel */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          {loadingFeatured ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : bestSellers.length > 0 ? (
            <BestSellersCarousel
              products={bestSellers}
              title="Best Sellers"
              viewAllLink="/shop"
            />
          ) : (
            <div className="text-center py-12">
              <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-4">
                Best Sellers
              </h2>
              <p className="text-muted-foreground">Check back soon for our featured products!</p>
            </div>
          )}
        </div>
      </section>

      {/* Shop by Category */}
      {categories.length > 0 && (
        <section className="py-20 bg-secondary/50">
          <div className="max-w-7xl mx-auto px-4">
            <CategoryGrid
              categories={categories}
              title="Shop by Category"
              columns={4}
            />
          </div>
        </section>
      )}

      {/* Story Section */}
      <StorySection
        title="Four Decades of Passion"
        subtitle="Our Heritage"
        content={[
          "Since 1987, Sharma Coffee Works has been crafting exceptional coffee in the misty hills of Coorg. Our journey began with a simple belief: great coffee comes from patience, tradition, and respect for the craft.",
          "Every bean is hand-selected from high-altitude estates, slow-roasted using traditional methods, and blended with the finest ghee-roasted chicory from Jamnagar."
        ]}
        image={coffeePlantImg}
        ctaText="Learn More"
        ctaLink="/about"
        layout="right"
        theme="dark"
      />

      {/* Google Reviews */}
      <section className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-medium tracking-[0.3em] uppercase mb-4">
              Reviews
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground">
              What Our Customers Say
            </h2>
            <div className="section-divider mt-6" />
          </div>
          <div className="sk-ww-google-reviews" data-embed-id="25643427"></div>
        </div>
      </section>

      {/* Instagram Feed */}
      <InstagramFeed />

      {/* Final CTA */}
      <section className="relative py-32 overflow-hidden">
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

      {/* Ambient Coffee Sound */}
      <AmbientSound
        audioSrc="https://cdn.pixabay.com/audio/2024/07/30/audio_86b9700fe6.mp3"
        label="Coffee Pouring"
        volume={0.4}
        autoPlay={true}
      />
    </div>
  );
}