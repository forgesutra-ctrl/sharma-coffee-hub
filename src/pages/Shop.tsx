import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/coffee/Layout';
import { allProductSections, ProductSection } from '@/data/productSections';
import ProductSectionCard from '@/components/coffee/ProductSectionCard';

const Shop = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [activeCategory, setActiveCategory] = useState<string | null>(slug || null);

  const filteredSections = activeCategory
    ? allProductSections.filter(s => s.slug === activeCategory)
    : allProductSections;

  const categories = [
    { id: null, name: 'All Products' },
    { id: 'filter-coffee-blends', name: 'Filter Coffee' },
    { id: 'specialty-blends', name: 'Specialty Blends' },
    { id: 'instant-coffee-decoctions', name: 'Instant Coffee' },
    { id: 'other-products', name: 'Beyond Coffee' },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="relative h-[40vh] min-h-[300px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: 'url(https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg)',
              opacity: 0.3 
            }}
          />
          <div className="relative z-10 text-center px-4">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              Our Coffee Collection
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Crafted with passion since 1985. Premium beans from Coorg, roasted to perfection.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id || 'all'}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`
                    whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${activeCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Sections */}
        <div className="py-8">
          {filteredSections.map((section, index) => (
            <ProductSectionCard
              key={section.id}
              section={section}
              reversed={index % 2 === 1}
            />
          ))}
        </div>

        {filteredSections.length === 0 && (
          <div className="container mx-auto px-4 py-16 text-center">
            <p className="text-muted-foreground">No products found in this category.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Shop;
