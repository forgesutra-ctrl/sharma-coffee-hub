import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  title: string;
  image: string;
  href: string;
}

interface CategoryGridProps {
  categories: Category[];
  title?: string;
  columns?: 2 | 3 | 4 | 6;
}

export default function CategoryGrid({
  categories,
  title = 'Shop By Category',
  columns = 6,
}: CategoryGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground">
            {title}
          </h2>
        </div>

        {/* Grid */}
        <div className={cn('grid gap-4 md:gap-6', gridCols[columns])}>
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={category.href}
              className="category-card group aspect-[3/4] relative rounded-sm overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Image */}
              <img
                src={category.image}
                alt={category.title}
                className="category-image absolute inset-0 w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="category-overlay" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-5 z-10">
                <h3 className="font-display text-lg md:text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                  {category.title}
                </h3>
                
                <div className="mt-3 flex items-center gap-2 text-primary text-xs font-medium tracking-[0.15em] uppercase opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-400">
                  Shop Now
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}