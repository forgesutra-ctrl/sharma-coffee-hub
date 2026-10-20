import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, MessageCircle, PackageCheck, Repeat, Sparkles, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProducts, getUniqueProducts, useProductsByCategoryId, type FlatProduct } from '@/hooks/useProducts';
import { useCategoriesWithCount, useCategoryBySlug } from '@/hooks/useCategories';
import { PHONE_TEL, WHATSAPP_URL } from '@/components/nav/commerce';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import '@/components/home-v2/home-v2.css';

// The shop listing, in the reference redesign's language (coorg-s-golden-roast,
// src/components/shop-page.tsx): intro, category pills, card grid and call band.
// Unlike the reference, cards show a "from ₹X" price and link to the product page,
// where the blend and size are chosen; and sort, stock and price filters stay.

const priceRanges = [
  { value: 'all', label: 'All prices' },
  { value: '0-300', label: '₹0 – ₹300' },
  { value: '300-500', label: '₹300 – ₹500' },
  { value: '500-800', label: '₹500 – ₹800' },
  { value: '800-2000', label: '₹800+' },
];

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'name-az', label: 'Alphabetically, A–Z' },
  { value: 'name-za', label: 'Alphabetically, Z–A' },
  { value: 'price-low', label: 'Price, low to high' },
  { value: 'price-high', label: 'Price, high to low' },
];

/** The card's one-line tagline: the description's first sentence, else the flavour notes. */
function tagline(product: FlatProduct) {
  const first = product.description.split(/(?<=[.!?])\s/)[0]?.trim();
  return first || product.flavorNotes.join(' · ');
}

function ShopCard({ product, index }: { product: FlatProduct; index: number }) {
  const [imageError, setImageError] = useState(false);
  const discount = product.subscription_eligible ? product.subscription_discount_percentage : undefined;
  return (
    <Link to={`/product/${product.slug}`} className="shop-card product-item">
      <div className="product-image shop-card-image">
        <span className="product-number">{String(index + 1).padStart(2, '0')}</span>
        {!product.inStock && <span className="product-label shop-card-sold-out">SOLD OUT</span>}
        <img
          src={imageError ? '/placeholder.svg' : product.image}
          alt={product.name}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      </div>
      <p className="eyebrow product-category">{product.category}</p>
      <h3 className="shop-card-name">{product.name}</h3>
      <p className="shop-card-tagline">{tagline(product)}</p>
      <div className="shop-card-footer">
        <div className="shop-price">
          {product.inStock ? (
            <span className="shop-price-value">from ₹{product.price.toLocaleString('en-IN')}</span>
          ) : (
            <span className="shop-price-value shop-price-value--sold-out">Sold Out</span>
          )}
          {product.inStock && discount ? (
            <span className="shop-price-note"><Repeat /> Subscribe &amp; save {discount}%</span>
          ) : null}
        </div>
        <span className="shop-card-view" aria-hidden>View <ArrowUpRight /></span>
      </div>
    </Link>
  );
}

const Shop = () => {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.trim().toLowerCase() ?? '';

  const [sortBy, setSortBy] = useState<string>(() => searchParams.get('sort') || 'featured');
  const [priceRange, setPriceRange] = useState<string>(() => searchParams.get('price') || 'all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(() => {
    const s = searchParams.get('stock');
    return s === null || s === '' ? true : s === '1' || s === 'true';
  });

  // Sync filters to URL
  const updateUrlFilters = (updates: { sort?: string; price?: string; stock?: boolean }) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (updates.sort !== undefined) (updates.sort && updates.sort !== 'featured') ? next.set('sort', updates.sort) : next.delete('sort');
      if (updates.price !== undefined) (updates.price && updates.price !== 'all') ? next.set('price', updates.price) : next.delete('price');
      if (updates.stock !== undefined) next.set('stock', updates.stock ? '1' : '0');
      return next;
    }, { replace: true });
  };

  const handleSortChange = (val: string) => {
    setSortBy(val);
    updateUrlFilters({ sort: val });
  };
  const handlePriceChange = (val: string) => {
    setPriceRange(val);
    updateUrlFilters({ price: val });
  };
  const handleStockChange = (checked: boolean) => {
    setInStockOnly(checked);
    updateUrlFilters({ stock: checked });
  };

  // Sync state from URL when user navigates (e.g. back/forward)
  useEffect(() => {
    const sort = searchParams.get('sort') || 'featured';
    const price = searchParams.get('price') || 'all';
    const stock = searchParams.get('stock');
    const stockVal = stock === null || stock === '' ? true : stock === '1' || stock === 'true';
    setSortBy(sort);
    setPriceRange(price);
    setInStockOnly(stockVal);
  }, [searchParams]);

  const { data: dbCategories } = useCategoriesWithCount();
  const { data: currentCategory } = useCategoryBySlug(categorySlug);

  const { data: rawProducts, isLoading: loadingAllProducts, error: errorAllProducts } = useProducts();
  const { data: categoryProducts, isLoading: loadingCategoryProducts, error: errorCategoryProducts } = useProductsByCategoryId(currentCategory?.id);

  const isLoading = categorySlug ? loadingCategoryProducts : loadingAllProducts;
  const error = categorySlug ? errorCategoryProducts : errorAllProducts;

  // Get unique products (one per product, not per variant)
  const allProducts = useMemo(() => {
    const productsToUse = categorySlug && categoryProducts ? categoryProducts : rawProducts;
    return productsToUse ? getUniqueProducts(productsToUse) : [];
  }, [rawProducts, categoryProducts, categorySlug]);

  // Pill counts come from the same listed products the grid shows. The categories'
  // product_count also counts child products (e.g. Gold blend 1/2/3), which are never
  // listed, so it overstated categories with blends (Coffee Powders: 19 vs 7 shown).
  const categories = useMemo(() => {
    const listed = rawProducts ? getUniqueProducts(rawProducts) : [];
    return [
      { id: null, slug: null, name: 'All', count: listed.length },
      ...(dbCategories?.map(cat => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        count: listed.filter((p) => p.categorySlug === cat.slug).length,
      })) || []),
    ];
  }, [dbCategories, rawProducts]);

  // Filter by stock availability
  const stockFilteredProducts = useMemo(() => {
    if (!inStockOnly) return allProducts;
    return allProducts.filter(p => p.inStock);
  }, [allProducts, inStockOnly]);

  // Filter by price range
  const priceFilteredProducts = useMemo(() => {
    if (priceRange === 'all') return stockFilteredProducts;

    const [min, max] = priceRange.split('-').map(Number);
    return stockFilteredProducts.filter(p => {
      if (max) return p.price >= min && p.price <= max;
      return p.price >= min;
    });
  }, [stockFilteredProducts, priceRange]);

  // Sort products
  const sortedProducts = useMemo(() => {
    const products = [...priceFilteredProducts];

    switch (sortBy) {
      case 'price-low':
        return products.sort((a, b) => a.price - b.price);
      case 'price-high':
        return products.sort((a, b) => b.price - a.price);
      case 'name-az':
        return products.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-za':
        return products.sort((a, b) => b.name.localeCompare(a.name));
      case 'featured':
      default:
        return products.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return a.name.localeCompare(b.name);
        });
    }
  }, [priceFilteredProducts, sortBy]);

  // Filter by URL search query (?q=) so header search can send users to shop with a query
  const displayProducts = useMemo(() => {
    if (!searchQuery) return sortedProducts;
    return sortedProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery) ||
        (p.category?.toLowerCase().includes(searchQuery) ?? false) ||
        (p.description?.toLowerCase().includes(searchQuery) ?? false)
    );
  }, [sortedProducts, searchQuery]);

  const rawQuery = searchParams.get('q')?.trim() ?? '';
  const activeCount = categories.find((c) => c.slug === (categorySlug ?? null))?.count ?? 0;
  const inStockCount = allProducts.filter(p => p.inStock).length;

  return (
    <div className="home-v2 shop-page">
      <section className="shop-hero section-inner">
        <Link to="/" className="shop-back"><ArrowLeft size={14} /> Back to our story</Link>
        <p className="eyebrow">
          {['THE SHARMA PANTRY', currentCategory?.name.toUpperCase(), activeCount ? `${activeCount} ${activeCount === 1 ? 'PRODUCT' : 'PRODUCTS'}` : null]
            .filter(Boolean).join(' · ')}
        </p>
        <h1>
          {searchQuery
            ? <>Search results<br /><em>for “{rawQuery}”.</em></>
            : <>{currentCategory ? `${currentCategory.name}.` : 'Everything we make.'}<br /><em>From our hills to you.</em></>}
        </h1>
        {searchQuery ? (
          <p className="shop-hero-note">
            {displayProducts.length} {displayProducts.length === 1 ? 'product' : 'products'} found ·{' '}
            <Link to={categorySlug ? `/shop/${categorySlug}` : '/shop'} className="shop-hero-link">Clear search</Link>
          </p>
        ) : (
          <p className="shop-hero-note">
            Coffee powders, liquid decoctions, fusion jams and more — hand-selected, slow-roasted,
            and packed with care in Madikeri. Choose a product to pick your blend and size.
          </p>
        )}
        <div className="shop-perks">
          <span><PackageCheck /> Freshly roasted to order</span>
          <span><Truck /> Standard shipping rates apply</span>
          <span><Repeat /> Want free shipping? <Link to="/subscriptions">Subscribe instead</Link></span>
        </div>
      </section>

      {/* Category pills are links, so a pill and a direct visit to /shop/{slug} are the same state. */}
      <nav className="shop-filters section-inner" aria-label="Filter by category">
        {categories.map((cat) => {
          const active = (categorySlug ?? null) === cat.slug;
          return (
            <Link
              key={cat.id ?? 'all'}
              to={cat.slug ? `/shop/${cat.slug}` : '/shop'}
              className={`shop-filter ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              {cat.name} <span className="shop-filter-count">{cat.count}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shop-toolbar section-inner">
        <p className="shop-toolbar-count">
          {displayProducts.length} {displayProducts.length === 1 ? 'product' : 'products'}
        </p>
        <div className="shop-toolbar-controls">
          <button
            type="button"
            className={`shop-control shop-toggle ${inStockOnly ? 'is-active' : ''}`}
            aria-pressed={inStockOnly}
            onClick={() => handleStockChange(!inStockOnly)}
          >
            In stock only <span className="shop-filter-count">{inStockCount}</span>
          </button>
          <Select value={priceRange} onValueChange={handlePriceChange}>
            <SelectTrigger className="shop-control shop-select" aria-label="Price">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent className="rounded-none z-[100000]">
              {priceRanges.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="shop-control shop-select" aria-label="Sort by">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-none z-[100000]">
              {sortOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <section className="shop-grid section-inner" aria-label="Loading products" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shop-card product-item--loading">
              <div className="product-image shop-card-image" />
            </div>
          ))}
        </section>
      ) : error ? (
        <div className="shop-empty section-inner">
          <p>Failed to load products</p>
          <button type="button" onClick={() => window.location.reload()} className="shop-hero-link">Try again</button>
        </div>
      ) : displayProducts.length === 0 ? (
        <div className="shop-empty section-inner">
          <p>No products found{searchQuery ? ' for this search' : ' in this category'}.</p>
          <Link to="/shop" onClick={() => handlePriceChange('all')} className="shop-hero-link">View all products</Link>
        </div>
      ) : (
        <section className="shop-grid section-inner" aria-label="Products">
          {displayProducts.map((p, i) => <ShopCard key={p.productId} product={p} index={i} />)}
        </section>
      )}

      <section className="shop-footer-cta">
        <p className="eyebrow">CAN'T DECIDE?</p>
        <h2>Call us. We know our coffee.</h2>
        <div className="shop-footer-actions">
          <Button asChild variant="hero"><a href={PHONE_TEL}>+91 8762 988 145</a></Button>
          <Button asChild variant="film">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"><MessageCircle /> Chat on WhatsApp <ArrowUpRight /></a>
          </Button>
        </div>
        <Link to="/quiz" className="shop-footer-quiz">
          <Sparkles /> Or take our 1-minute taste profile quiz <ArrowUpRight />
        </Link>
      </section>
    </div>
  );
};

export default Shop;
