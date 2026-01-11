import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Layout from '@/components/coffee/Layout';
import { allProductSections, ProductSection, ProductVariant } from '@/data/productSections';
import ProductCard from '@/components/coffee/ProductCard';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FlatProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  secondaryImage?: string;
  category: string;
  categorySlug: string;
  description: string;
  flavorNotes: string[];
  inStock: boolean;
  origin?: string;
  roastLevel?: string;
  intensity?: number;
  arabicaPercent?: number;
  robustaPercent?: number;
  chicoryPercent?: number;
}

const Shop = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [activeCategory, setActiveCategory] = useState<string | null>(slug || null);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [priceRange, setPriceRange] = useState<string>('all');

  useEffect(() => {
    setActiveCategory(slug || null);
  }, [slug]);

  // Flatten all products from sections
  const allProducts: FlatProduct[] = allProductSections.flatMap(section =>
    section.variants.map(variant => ({
      id: variant.id,
      name: variant.name,
      slug: section.slug,
      price: variant.price,
      image: variant.image,
      secondaryImage: variant.images?.[1],
      category: section.title,
      categorySlug: section.slug,
      description: variant.description,
      flavorNotes: variant.flavorNotes,
      inStock: true,
      origin: variant.origin,
      roastLevel: variant.roastLevel,
      intensity: variant.intensity,
      arabicaPercent: variant.arabicaPercent,
      robustaPercent: variant.robustaPercent,
      chicoryPercent: variant.chicoryPercent,
    }))
  );

  // Filter products
  let filteredProducts = activeCategory
    ? allProducts.filter(p => p.categorySlug === activeCategory)
    : allProducts;

  // Price filter
  if (priceRange !== 'all') {
    const [min, max] = priceRange.split('-').map(Number);
    filteredProducts = filteredProducts.filter(p => {
      if (max) return p.price >= min && p.price <= max;
      return p.price >= min;
    });
  }

  // Sort products
  filteredProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name-az':
        return a.name.localeCompare(b.name);
      case 'name-za':
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

  const categories = [
    { id: null, name: 'All Products', count: allProducts.length },
    { id: 'coorg-classic', name: 'Coorg Classic', count: allProducts.filter(p => p.categorySlug === 'coorg-classic').length },
    { id: 'gold-blend', name: 'Gold Blend', count: allProducts.filter(p => p.categorySlug === 'gold-blend').length },
    { id: 'premium-blend', name: 'Premium Blend', count: allProducts.filter(p => p.categorySlug === 'premium-blend').length },
    { id: 'specialty-blends', name: 'Specialty Blend', count: allProducts.filter(p => p.categorySlug === 'specialty-blends').length },
    { id: 'royal-caffeine', name: 'Royal Caffeine', count: allProducts.filter(p => p.categorySlug === 'royal-caffeine').length },
    { id: 'instant-coffee-decoctions', name: 'Instant Coffee', count: allProducts.filter(p => p.categorySlug === 'instant-coffee-decoctions').length },
    { id: 'tea-products', name: 'Tea', count: allProducts.filter(p => p.categorySlug === 'tea-products').length },
    { id: 'other-products', name: 'Beyond Coffee', count: allProducts.filter(p => p.categorySlug === 'other-products').length },
  ];

  const priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: '0-300', label: '₹0 - ₹300' },
    { value: '300-500', label: '₹300 - ₹500' },
    { value: '500-800', label: '₹500 - ₹800' },
    { value: '800-1200', label: '₹800 - ₹1200' },
  ];

  const activeCategoryName = categories.find(c => c.id === activeCategory)?.name || 'All Products';

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Announcement Bar Style Header */}
        <div className="bg-primary text-primary-foreground py-2.5 text-center text-xs font-medium tracking-[0.2em] uppercase">
          Free Shipping On all orders over ₹1000
        </div>

        {/* Breadcrumb */}
        <div className="border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors">
                Collections
              </Link>
              {activeCategory && (
                <>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{activeCategoryName}</span>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Page Title */}
        <div className="border-b border-border/50 py-12 text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-semibold text-foreground">
            {activeCategoryName}
          </h1>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters - Desktop */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* Availability */}
                <Accordion type="single" collapsible defaultValue="availability" className="border-b border-border/50">
                  <AccordionItem value="availability" className="border-none">
                    <AccordionTrigger className="py-4 text-sm font-medium tracking-[0.15em] uppercase hover:no-underline">
                      Availability
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <input type="checkbox" className="w-4 h-4 rounded border-border" defaultChecked />
                          <span>In Stock</span>
                          <span className="ml-auto text-xs">({filteredProducts.length})</span>
                        </label>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Price */}
                <Accordion type="single" collapsible defaultValue="price" className="border-b border-border/50">
                  <AccordionItem value="price" className="border-none">
                    <AccordionTrigger className="py-4 text-sm font-medium tracking-[0.15em] uppercase hover:no-underline">
                      Price
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-2">
                        {priceRanges.map(range => (
                          <label
                            key={range.value}
                            className="flex items-center gap-3 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <input
                              type="radio"
                              name="price"
                              checked={priceRange === range.value}
                              onChange={() => setPriceRange(range.value)}
                              className="w-4 h-4 border-border"
                            />
                            <span>{range.label}</span>
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Categories */}
                <Accordion type="single" collapsible defaultValue="categories" className="border-b border-border/50">
                  <AccordionItem value="categories" className="border-none">
                    <AccordionTrigger className="py-4 text-sm font-medium tracking-[0.15em] uppercase hover:no-underline">
                      Categories
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-2">
                        {categories.map(cat => (
                          <button
                            key={cat.id || 'all'}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                              'flex items-center justify-between w-full text-left py-1.5 text-sm transition-colors',
                              activeCategory === cat.id
                                ? 'text-primary font-medium'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <span>{cat.name}</span>
                            <span className="text-xs">({cat.count})</span>
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </aside>

            {/* Products Grid */}
            <main className="flex-1">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                <p className="text-sm text-muted-foreground">
                  {filteredProducts.length} products
                </p>

                {/* Mobile Category Selector */}
                <div className="lg:hidden">
                  <Select value={activeCategory || 'all'} onValueChange={(val) => setActiveCategory(val === 'all' ? null : val)}>
                    <SelectTrigger className="w-[160px] bg-transparent border-border/50">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id || 'all'} value={cat.id || 'all'}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] bg-transparent border-border/50">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="name-az">Alphabetically, A-Z</SelectItem>
                    <SelectItem value="name-za">Alphabetically, Z-A</SelectItem>
                    <SelectItem value="price-low">Price, low to high</SelectItem>
                    <SelectItem value="price-high">Price, high to low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Products */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory || 'all'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                >
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {filteredProducts.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">No products found in this category.</p>
                  <button
                    onClick={() => {
                      setActiveCategory(null);
                      setPriceRange('all');
                    }}
                    className="text-primary hover:underline"
                  >
                    View all products
                  </button>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Shop;
