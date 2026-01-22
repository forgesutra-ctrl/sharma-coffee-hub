import { Link } from "react-router-dom";
import { ArrowRight, Truck, RefreshCw, Award, Loader2, Instagram, ExternalLink } from "lucide-react";
import { useEffect } from "react";

import HeroVideo from "@/components/coffee/HeroVideo";
import BestSellersCarousel from "@/components/coffee/BestSellersCarousel";
import CategoryGrid from "@/components/coffee/CategoryGrid";
import StorySection from "@/components/coffee/StorySection";
import AmbientSound from "@/components/coffee/AmbientSound";

import heroVideo from "@/assets/videos/hero-coffee-brewing.mp4";
import coffeePlantImg from "@/assets/chatgpt_image_jan_12,_2026,_10_25_34_am copy.jpeg";

import { useFeaturedProducts, useProducts } from "@/hooks/useProducts";
import { useCategoriesWithCount } from "@/hooks/useCategories";

export default function Homepage() {
  const { data: featuredProducts, isLoading: loadingFeatured } =
    useFeaturedProducts();
  const { data: allProducts } = useProducts();
  const { data: dbCategories } = useCategoriesWithCount();

  // Load Google Reviews widget
  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src*="google-reviews/widget.js"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://widgets.sociablekit.com/google-reviews/widget.js";
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  // Load Instagram Feed widget
  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src*="instagram-feed/widget.js"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://widgets.sociablekit.com/instagram-feed/widget.js";
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const bestSellers =
    featuredProducts?.map(product => ({
      id: product.productId,
      name: product.name,
      price: product.price,
      image: product.image,
      hoverImage: undefined,
      href: `/product/${product.slug}`,
      badge: product.isFeatured ? "Best Seller" : undefined,
    })) || [];

  const categories =
    dbCategories
      ?.filter(cat => cat.product_count && cat.product_count > 0)
      .slice(0, 6)
      .map(cat => {
        const categoryProduct = allProducts?.find(
          p => p.category_id === cat.id
        );
        return {
          id: cat.id,
          title: cat.name,
          image: categoryProduct?.image_url || "/placeholder.svg",
          href: `/shop/${cat.slug}`,
        };
      }) || [];

  return (
    <div className="min-h-screen w-full bg-background overflow-x-hidden">
      {/* HERO */}
      <section className="w-full">
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
      </section>

      {/* FEATURES */}
      <section className="w-full py-6 border-y border-border/30">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-6">
          <Feature icon={Truck} title="Free Shipping" desc="Subscription Members Only" />
          <Feature icon={RefreshCw} title="Easy Returns" desc="7-day hassle-free returns" />
          <Feature icon={Award} title="Premium Quality" desc="Since 1987" />
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="w-full py-16">
        <div className="max-w-7xl mx-auto px-4">
          {loadingFeatured ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <BestSellersCarousel
              products={bestSellers}
              title="Best Sellers"
              viewAllLink="/shop"
            />
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <section className="w-full py-20 bg-secondary/50">
          <div className="max-w-7xl mx-auto px-4">
            <CategoryGrid
              categories={categories}
              title="Shop by Category"
              columns={4}
            />
          </div>
        </section>
      )}

      {/* STORY SECTION */}
      <StorySection
        title="Four Decades of Passion"
        subtitle="Our Heritage"
        content={[
          "Since 1987, Sharma Coffee Works has been crafting exceptional coffee in the misty hills of Coorg.",
          "Every bean is hand-selected, slow-roasted, and blended with the finest ghee-roasted chicory."
        ]}
        image={coffeePlantImg}
        ctaText="Learn More"
        ctaLink="/about"
        layout="right"
        theme="dark"
      />

      {/* REVIEWS */}
      <section className="w-full py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl md:text-5xl font-semibold mb-4">
              What Our Customers Say
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Read what our customers have to say about their experience with Sharma Coffee Works
            </p>
          </div>
          
          {/* Scrollable Reviews Container */}
          <div className="flex justify-center">
            <div 
              className="relative w-full max-w-5xl mx-auto rounded-xl border border-primary/20 overflow-hidden bg-background/50"
              style={{ 
                maxHeight: '700px',
              }}
            >
              <div 
                className="google-reviews-scroll overflow-y-auto overflow-x-hidden"
                style={{
                  maxHeight: '700px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(200, 169, 126, 0.5) transparent',
                }}
              >
                <div 
                  className="sk-ww-google-reviews p-6" 
                  data-embed-id="25643427"
                  style={{ 
                    width: '100%',
                    minHeight: '500px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Custom Scrollbar Styling */}
          <style>{`
            .google-reviews-scroll::-webkit-scrollbar {
              width: 8px;
            }
            .google-reviews-scroll::-webkit-scrollbar-track {
              background: transparent;
              border-radius: 4px;
            }
            .google-reviews-scroll::-webkit-scrollbar-thumb {
              background: rgba(200, 169, 126, 0.5);
              border-radius: 4px;
            }
            .google-reviews-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(200, 169, 126, 0.7);
            }
            .sk-ww-google-reviews {
              width: 100%;
            }
            .sk-ww-google-reviews iframe {
              border-radius: 8px;
              width: 100% !important;
            }
            .sk-ww-google-reviews > div {
              width: 100% !important;
            }
          `}</style>
        </div>
      </section>

      {/* INSTAGRAM */}
      <section className="w-full py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Instagram className="w-8 h-8 text-primary" />
              <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase">
                @sharma_coffee_works
              </p>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Follow Our Journey
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Join our coffee community on Instagram for brewing tips, behind-the-scenes 
              glimpses, and the latest from our Coorg estates.
            </p>
          </div>
          
          {/* Scrollable Instagram Container */}
          <div className="flex justify-center">
            <div 
              className="relative w-full max-w-5xl mx-auto rounded-xl border border-primary/20 overflow-hidden bg-background/50"
              style={{ 
                maxHeight: '700px',
              }}
            >
              <div 
                className="instagram-widget-scroll overflow-y-auto overflow-x-hidden"
                style={{
                  maxHeight: '700px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(200, 169, 126, 0.5) transparent',
                }}
              >
                <div 
                  className="sk-instagram-feed p-6" 
                  data-embed-id="25646541"
                  style={{ 
                    width: '100%',
                    minHeight: '500px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Custom Scrollbar Styling */}
          <style>{`
            .instagram-widget-scroll::-webkit-scrollbar {
              width: 8px;
            }
            .instagram-widget-scroll::-webkit-scrollbar-track {
              background: transparent;
              border-radius: 4px;
            }
            .instagram-widget-scroll::-webkit-scrollbar-thumb {
              background: rgba(200, 169, 126, 0.5);
              border-radius: 4px;
            }
            .instagram-widget-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(200, 169, 126, 0.7);
            }
            .sk-instagram-feed {
              width: 100%;
            }
            .sk-instagram-feed iframe {
              border-radius: 8px;
              width: 100% !important;
            }
            .sk-instagram-feed > div {
              width: 100% !important;
            }
          `}</style>

          {/* CTA */}
          <div className="text-center mt-10">
            <a
              href="https://www.instagram.com/sharma_coffee_works/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors group"
            >
              <Instagram className="w-5 h-5" />
              <span>Follow us on Instagram</span>
              <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative w-full py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent" />
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <h2 className="font-display text-5xl text-primary-foreground mb-6">
            Experience the Taste of Coorg
          </h2>
          <Link
            to="/shop"
            className="inline-flex items-center gap-3 bg-background px-10 py-5 uppercase tracking-wide"
          >
            Shop Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* AMBIENT SOUND */}
      <AmbientSound
        audioSrc="/coffee-pour.mp3.mp3"
        label="Coffee Pouring"
        volume={0.4}
        autoPlay
      />
    </div>
  );
}

/* ---------- FEATURE BLOCK ---------- */

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-4 justify-center">
      <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
