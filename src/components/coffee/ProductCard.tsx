import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye } from 'lucide-react';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <div className="group bg-card overflow-hidden border border-border hover:border-gold/30 transition-all duration-500">
      {/* Image Container */}
      <Link to={`/product/${product.slug}`} className="block relative overflow-hidden aspect-square">
        <img
          src={product.image_url || 'https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Quick actions on hover */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <span className="flex items-center gap-2 px-5 py-2.5 bg-cream text-coffee-foreground text-sm font-medium uppercase tracking-wider transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <Eye className="w-4 h-4" />
            View
          </span>
        </div>

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {product.is_featured && (
            <span className="px-3 py-1 bg-gold text-coffee-foreground text-xs font-semibold uppercase tracking-wider">
              Featured
            </span>
          )}
          {product.has_chicory && (
            <span className="px-3 py-1 bg-background/90 text-foreground text-xs font-medium uppercase tracking-wider backdrop-blur-sm">
              With Chicory
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <span className="px-6 py-3 bg-card text-foreground font-semibold uppercase tracking-wider">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-5">
        {/* Category/Roast tag */}
        <div className="mb-2">
          <span className="text-gold text-xs font-medium uppercase tracking-widest">
            {product.roast_level} Roast
          </span>
        </div>

        {/* Name */}
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-serif text-xl text-foreground mb-2 group-hover:text-gold transition-colors duration-200 line-clamp-1">
            {product.name}
          </h3>
        </Link>

        {/* Flavor notes */}
        {product.flavor_notes && product.flavor_notes.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-1">
            {product.flavor_notes.slice(0, 3).join(' • ')}
          </p>
        )}

        {/* Price and Add to Cart */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <span className="text-2xl font-semibold text-foreground">₹{product.price}</span>
            <span className="text-sm text-muted-foreground ml-1">onwards</span>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              onAddToCart && onAddToCart(product);
            }}
            disabled={!product.in_stock}
            className="p-3 bg-gold text-coffee-foreground hover:bg-gold-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
