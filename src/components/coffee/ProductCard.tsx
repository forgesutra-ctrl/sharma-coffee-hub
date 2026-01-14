import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    image: string;
    secondaryImage?: string;
    category: string;
    categorySlug: string;
    description?: string;
    flavorNotes?: string[];
    inStock?: boolean;
  };
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const inStock = product.inStock !== false;

  // Navigate to product detail page using slug
  const productUrl = `/product/${product.slug}`;

  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <Link 
        to={productUrl}
        className="block relative overflow-hidden bg-card aspect-square"
      >
        {/* Primary Image */}
        <img
          src={imageError ? '/placeholder.svg' : product.image}
          alt={product.name}
          onError={() => setImageError(true)}
          className={cn(
            "w-full h-full object-cover transition-all duration-500",
            isHovered && product.secondaryImage ? "opacity-0" : "opacity-100"
          )}
        />
        
        {/* Secondary Image (on hover) */}
        {product.secondaryImage && (
          <img
            src={product.secondaryImage}
            alt={`${product.name} alternate view`}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-all duration-500",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Quick Add Button - Appears on hover */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Navigate to product page for variant selection
            window.location.href = productUrl;
          }}
          disabled={!inStock}
          className={cn(
            "absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center",
            "bg-card/90 backdrop-blur-sm border border-border/50",
            "transition-all duration-300",
            "hover:bg-primary hover:text-primary-foreground hover:border-primary",
            "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0",
            !inStock && "opacity-50 cursor-not-allowed"
          )}
        >
          <ShoppingBag className="w-4 h-4" />
        </button>

        {/* View Product Overlay */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center",
          "bg-background/20 backdrop-blur-[2px]",
          "transition-all duration-300",
          "opacity-0 group-hover:opacity-100"
        )}>
          <span className={cn(
            "px-6 py-2 text-sm font-medium tracking-wider uppercase",
            "bg-card/95 backdrop-blur-sm text-foreground",
            "transition-all duration-300",
            "translate-y-4 group-hover:translate-y-0"
          )}>
            View Product
          </span>
        </div>

        {/* Sold Out Badge */}
        {!inStock && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-muted text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Sold Out
          </div>
        )}
      </Link>

      {/* Product Info */}
      <div className="pt-4 text-center">
        <Link 
          to={productUrl}
          className="block"
        >
          <h3 className="font-serif text-base md:text-lg font-medium text-foreground line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        
        <p className="mt-2 text-sm text-muted-foreground">
          {inStock ? (
            <>
              <span className="text-foreground font-medium">from ₹{product.price.toLocaleString()}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Sold Out</span>
          )}
        </p>
      </div>
    </div>
  );
};

export default ProductCard;
