import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Section 3, "A coffee for your kind of morning." Ported from the reference, which
// hardcoded four products linking to the old external shop. Facts (image, slug,
// price) come from Supabase; marketing copy comes from the map below.
//
// FOLLOW-UP (content, not code): the four cards show only two distinct photos.
// coorg-classic and gold-blend have byte-identical image_url files, and so do
// premium-blend and speciality-blend; no product in these lines has its own photo.
// Fix by uploading per-product images in the admin panel; no code change needed.

/**
 * MARKETING COPY — not product data. There is no DB column for any of these yet.
 *  - title:   short display name. products.name is the full, long name (it stays on
 *             the product page). Follow-up: add products.short_name.
 *  - eyebrow: editorial line above the title, not the product's category.
 *  - detail:  one-line descriptor under the title.
 * Move all three into the DB when there is a home for them. Order here is card order.
 */
const FEATURED: { slug: string; title: string; eyebrow: string; detail: string }[] = [
  { slug: 'coorg-classic', title: 'Coorg Classic', eyebrow: 'THE EVERYDAY FAVOURITE', detail: 'Arabica, Robusta & chicory' },
  { slug: 'gold-blend', title: 'Gold Blend', eyebrow: 'A SHARMA ORIGINAL', detail: 'A classic Coorg blend' },
  { slug: 'premium-blend', title: 'Premium Blend', eyebrow: 'YOUR MORNING RITUAL', detail: 'Crafted for the perfect cup' },
  { slug: 'speciality-blend', title: 'Speciality Blend', eyebrow: 'SOMETHING SPECIAL', detail: 'Discover a new favourite' },
];

type FeaturedProduct = { slug: string; image: string | null; fromPrice: number | null };

/** "from ₹X" uses the product's lowest variant price, matching /shop (getUniqueProducts). */
function lowestPrice(variants: { price: number }[] | null): number | null {
  if (!variants?.length) return null;
  return Math.min(...variants.map((v) => v.price));
}

async function fetchFeatured(): Promise<FeaturedProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('slug, image_url, product_variants(price)')
    .in('slug', FEATURED.map((p) => p.slug))
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []).map((p) => ({ slug: p.slug, image: p.image_url, fromPrice: lowestPrice(p.product_variants) }));
}

export function CoffeeSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['home-v2', 'featured-coffees'],
    queryFn: fetchFeatured,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Keep the copy-map order; drop any slug the DB did not return (inactive or renamed).
  const cards = FEATURED.flatMap((copy) => {
    const product = data?.find((p) => p.slug === copy.slug);
    return product ? [{ ...copy, ...product }] : [];
  });
  const failed = isError || (!isLoading && cards.length === 0);

  return (
    <section id="coffees" className="coffee-section">
      <div className="section-heading section-inner">
        <div>
          <p className="eyebrow">FIND YOUR EVERYDAY FAVOURITE</p>
          <h2>A coffee for <em>your kind</em> of morning.</h2>
        </div>
        <Link to="/shop" className="arrow-link">Explore all coffees <ArrowUpRight /></Link>
      </div>

      {failed ? (
        // Never a heading over nothing: say so, and point to the full shop.
        <p className="coffee-fallback section-inner">
          Our coffees are taking a moment to load.{' '}
          <Link to="/shop">Browse the full range <ArrowUpRight /></Link>
        </p>
      ) : (
        <div className="product-grid section-inner" aria-busy={isLoading}>
          {isLoading
            ? FEATURED.map((copy) => (
                <div key={copy.slug} className="product-item product-item--loading" aria-hidden="true">
                  <div className="product-image" />
                  <p className="eyebrow product-category">{copy.eyebrow}</p>
                  <div className="product-title"><h3>{copy.title}</h3></div>
                  <p className="product-detail">{copy.detail}</p>
                </div>
              ))
            : cards.map((card, i) => (
                <Link key={card.slug} to={`/product/${card.slug}`} className="product-item">
                  <div className="product-image">
                    <span className="product-number">0{i + 1}</span>
                    {i === 0 && <span className="product-label">THE CROWD FAVOURITE</span>}
                    <img src={card.image ?? '/placeholder.svg'} alt={`${card.title} by Sharma Coffee Works`} loading="lazy" />
                    <span className="product-arrow"><ArrowUpRight /></span>
                  </div>
                  <p className="eyebrow product-category">{card.eyebrow}</p>
                  <div className="product-title">
                    <h3>{card.title}</h3>
                    {card.fromPrice !== null && <span>from ₹{card.fromPrice.toLocaleString()}</span>}
                  </div>
                  <p className="product-detail">{card.detail}</p>
                </Link>
              ))}
        </div>
      )}
    </section>
  );
}
