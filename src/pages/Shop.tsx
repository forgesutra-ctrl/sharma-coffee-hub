import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Loader2 } from 'lucide-react';
import Layout from '@/components/coffee/Layout';
import ProductCard from '@/components/coffee/ProductCard';
import { cn } from '@/lib/utils';
import { useProducts, getUniqueProducts, useProductsByCategoryId } from '@/hooks/useProducts';
import { useCategoriesWithCount, useCategoryBySlug } from '@/hooks/useCategories';
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

const Shop = () => {
  const { categorySlug } = useParams<{ categorySlug?: string }>();

  const [sortBy, setSortBy] = useState<string>('featured');
  const [priceRange, setPriceRange] = useState<string>('all');

  const { data: dbCategories, isLoading: loadingCategories } = useCategoriesWithCount();
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

  const categories = useMemo(() => {
    return [
      { id: null, slug: null, name: 'All Products', count: rawProducts ? getUniqueProducts(rawProducts).length : 0 },
      ...(dbCategories?.map(cat => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        count: cat.product_count || 0,
      })) || []),
    ];
  }, [dbCategories, rawProducts]);

  // Filter by price range
  const priceFilteredProducts = useMemo(() => {
    if (priceRange === 'all') return allProducts;

    const [min, max] = priceRange.split('-').map(Number);
    return allProducts.filter(p => {
      if (max) return p.price >= min && p.price <= max;
      return p.price >= min;
    });
  }, [allProducts, priceRange]);

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

  const priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: '0-300', label: '₹0 - ₹300' },
    { value: '300-500', label: '₹300 - ₹500' },
    { value: '500-800', label: '₹500 - ₹800' },
    { value: '800-2000', label: '₹800+' },
  ];

  const activeCategoryName = currentCategory?.name || 'All Products';

  // Transform products for ProductCard
  const displayProducts = sortedProducts.map(product => ({
    id: product.productId,
    name: product.name,
    slug: product.slug,
    price: product.price,
    image: product.image,
    secondaryImage: undefined,
    category: product.category,
    categorySlug: product.categorySlug || product.category.toLowerCase().replace(/\s+/g, '-'),
    description: product.description,
    flavorNotes: product.flavorNotes,
    inStock: product.inStock,
  }));

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Announcement Bar Style Header */}
        <div className="bg-primary text-primary-foreground py-2.5 text-center text-xs font-medium tracking-[0.2em] uppercase">
          Free Shipping — A Privilege Extended Only to Our Subscription Members
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
                Shop
              </Link>
              {categorySlug && currentCategory && (
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
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-destructive mb-4">Failed to load products</p>
              <button 
                onClick={() => window.location.reload()} 
                className="text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
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
                            <span className="ml-auto text-xs">({sortedProducts.filter(p => p.inStock).length})</span>
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
                            <Link
                              key={cat.id || 'all'}
                              to={cat.slug ? `/shop/${cat.slug}` : '/shop'}
                              className={cn(
                                'flex items-center justify-between w-full text-left py-1.5 text-sm transition-colors',
                                (categorySlug === cat.slug || (!categorySlug && !cat.slug))
                                  ? 'text-primary font-medium'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              <span>{cat.name}</span>
                              <span className="text-xs">({cat.count})</span>
                            </Link>
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
                    {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'}
                  </p>

                  {/* Mobile Category Selector */}
                  <div className="lg:hidden">
                    <Select
                      value={categorySlug || 'all'}
                      onValueChange={(val) => {
                        if (val === 'all') {
                          window.location.href = '/shop';
                        } else {
                          window.location.href = `/shop/${val}`;
                        }
                      }}
                    >
                      <SelectTrigger className="w-[160px] bg-transparent border-border/50">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id || 'all'} value={cat.slug || 'all'}>
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
                    key={categorySlug || 'all'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                  >
                    {displayProducts.map((product, index) => (
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

                {sortedProducts.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground mb-4">No products found in this category.</p>
                    <Link
                      to="/shop"
                      onClick={() => setPriceRange('all')}
                      className="text-primary hover:underline"
                    >
                      View all products
                    </Link>
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Shop;
