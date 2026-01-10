import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Grid, LayoutGrid, SlidersHorizontal, X } from 'lucide-react';
import Layout from '@/components/coffee/Layout';
import { allProductSections, ProductSection } from '@/data/productSections';
import ProductSectionCard from '@/components/coffee/ProductSectionCard';
import OtherProductsSection from '@/components/coffee/OtherProductsSection';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const Shop = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [activeCategory, setActiveCategory] = useState<string | null>(slug || null);
  const [viewMode, setViewMode] = useState<'sections' | 'grid'>('sections');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Update active category when slug changes
  useEffect(() => {
    setActiveCategory(slug || null);
  }, [slug]);

  const filteredSections = activeCategory
    ? allProductSections.filter(s => s.slug === activeCategory)
    : allProductSections;

  const categories = [
    { id: null, name: 'All Products', count: allProductSections.length },
    { id: 'coorg-classic', name: 'Coorg Classic', count: 1 },
    { id: 'gold-blend', name: 'Gold Blend', count: 3 },
    { id: 'premium-blend', name: 'Premium Blend', count: 3 },
    { id: 'specialty-blends', name: 'Specialty Blend', count: 3 },
    { id: 'royal-caffeine', name: 'Royal Caffeine', count: 3 },
    { id: 'instant-coffee-decoctions', name: 'Instant Coffee', count: 5 },
    { id: 'tea-products', name: 'Tea', count: 3 },
    { id: 'other-products', name: 'Beyond Coffee', count: 8 },
  ];

  const handleCategoryClick = (id: string | null) => {
    setActiveCategory(id);
    setIsFilterOpen(false);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: 'url(https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg)',
            }}
          />
          <div className="absolute inset-0 bg-coffee-dark/40" />
          
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-primary text-sm font-medium tracking-[0.3em] uppercase mb-4"
            >
              Premium Coorg Coffee
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-7xl font-serif font-bold text-white mb-6"
            >
              Our Coffee Collection
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto"
            >
              Crafted with passion since 1987. Premium beans from Coorg, roasted to perfection.
            </motion.p>
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Sticky Filter Bar */}
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Desktop Category Filters */}
              <div className="hidden lg:flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id || 'all'}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={cn(
                      'whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300',
                      activeCategory === cat.id
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {cat.name}
                    <span className="ml-2 text-xs opacity-60">({cat.count})</span>
                  </button>
                ))}
              </div>

              {/* Mobile Filter Button */}
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle className="font-serif">Categories</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id || 'all'}
                        onClick={() => handleCategoryClick(cat.id)}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-sm transition-all duration-300 flex items-center justify-between',
                          activeCategory === cat.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        )}
                      >
                        <span>{cat.name}</span>
                        <span className="text-xs opacity-60">{cat.count}</span>
                      </button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* View Toggle & Active Filter */}
              <div className="flex items-center gap-3">
                {activeCategory && (
                  <button
                    onClick={() => setActiveCategory(null)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm lg:hidden"
                  >
                    {categories.find(c => c.id === activeCategory)?.name}
                    <X className="w-3 h-3" />
                  </button>
                )}
                
                <div className="hidden sm:flex items-center gap-1 p-1 bg-muted rounded-sm">
                  <button
                    onClick={() => setViewMode('sections')}
                    className={cn(
                      'p-2 rounded-sm transition-all',
                      viewMode === 'sections' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                    )}
                    aria-label="Section view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-2 rounded-sm transition-all',
                      viewMode === 'grid' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
                    )}
                    aria-label="Grid view"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Sections */}
        <div className="py-8 lg:py-12">
          <AnimatePresence mode="wait">
            {viewMode === 'sections' ? (
              <motion.div
                key="sections"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {filteredSections.map((section, index) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    {section.slug === 'other-products' ? (
                      <OtherProductsSection section={section} />
                    ) : (
                      <ProductSectionCard
                        section={section}
                        reversed={index % 2 === 1}
                      />
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="container mx-auto px-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredSections.flatMap(section =>
                    section.variants.map((variant, vIndex) => (
                      <motion.div
                        key={variant.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: vIndex * 0.05 }}
                        className="group product-card bg-card rounded-sm overflow-hidden"
                      >
                        <div className="relative aspect-square overflow-hidden">
                          <img
                            src={variant.image}
                            alt={variant.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Quick View Button */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <Link
                              to={`/shop/${section.slug}`}
                              className="px-6 py-2 bg-white text-coffee-dark font-medium rounded-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 hover:bg-primary hover:text-primary-foreground"
                            >
                              View Details
                            </Link>
                          </div>

                          {/* Flavor Tags */}
                          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                            {variant.flavorNotes.slice(0, 2).map(note => (
                              <span
                                key={note}
                                className="px-2 py-0.5 bg-background/90 backdrop-blur-sm text-xs font-medium rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              >
                                {note}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-4">
                          <p className="text-xs text-primary font-medium tracking-wider uppercase mb-1">
                            {section.title}
                          </p>
                          <h3 className="font-serif font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {variant.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {variant.description}
                          </p>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                            <span className="font-serif text-lg font-bold text-primary">
                              ₹{variant.price}
                            </span>
                            {variant.intensity && (
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div
                                    key={i}
                                    className={cn(
                                      'w-1.5 h-1.5 rounded-full',
                                      i <= variant.intensity! ? 'bg-primary' : 'bg-muted'
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {filteredSections.length === 0 && (
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6">
                We couldn't find any products in this category.
              </p>
              <Button onClick={() => setActiveCategory(null)} className="btn-premium-solid">
                View All Products
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Shop;
