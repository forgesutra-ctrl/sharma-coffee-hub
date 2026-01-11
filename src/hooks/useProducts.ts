import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductVariant {
  id: string;
  product_id: string;
  weight: number;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number | null;
}

export interface DatabaseProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  image_url: string | null;
  origin: string | null;
  roast_level: string | null;
  flavor_notes: string[] | null;
  intensity: number | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  product_variants: ProductVariant[];
}

export interface FlatProduct {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  image: string;
  category: string;
  description: string;
  flavorNotes: string[];
  inStock: boolean;
  origin: string | null;
  roastLevel: string | null;
  intensity: number | null;
  weight: number;
  isFeatured: boolean;
}

// Fetch all active products with their variants
async function fetchProducts(): Promise<DatabaseProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      description,
      category,
      image_url,
      origin,
      roast_level,
      flavor_notes,
      intensity,
      is_featured,
      is_active,
      created_at,
      updated_at,
      product_variants (
        id,
        product_id,
        weight,
        price,
        compare_at_price,
        stock_quantity
      )
    `)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as DatabaseProduct[]) || [];
}

// Get unique products (one entry per product, using lowest price variant)
export function getUniqueProducts(products: DatabaseProduct[]): FlatProduct[] {
  return products.map(product => {
    // Get the variant with lowest price (or first if no variants)
    const variants = product.product_variants || [];
    const lowestPriceVariant = variants.length > 0
      ? variants.reduce((min, v) => v.price < min.price ? v : min, variants[0])
      : null;

    return {
      id: product.id,
      productId: product.id,
      variantId: lowestPriceVariant?.id || product.id,
      name: product.name,
      slug: product.slug,
      price: lowestPriceVariant?.price || 0,
      comparePrice: lowestPriceVariant?.compare_at_price || null,
      image: product.image_url || '/placeholder.svg',
      category: product.category,
      description: product.description || '',
      flavorNotes: product.flavor_notes || [],
      inStock: (lowestPriceVariant?.stock_quantity ?? 0) > 0,
      origin: product.origin,
      roastLevel: product.roast_level,
      intensity: product.intensity,
      weight: lowestPriceVariant?.weight || 250,
      isFeatured: product.is_featured || false,
    };
  });
}

// Get flattened products (one entry per variant)
export function getFlatProducts(products: DatabaseProduct[]): FlatProduct[] {
  return products.flatMap(product => {
    const variants = product.product_variants || [];
    
    if (variants.length === 0) {
      return [{
        id: product.id,
        productId: product.id,
        variantId: product.id,
        name: product.name,
        slug: product.slug,
        price: 0,
        comparePrice: null,
        image: product.image_url || '/placeholder.svg',
        category: product.category,
        description: product.description || '',
        flavorNotes: product.flavor_notes || [],
        inStock: false,
        origin: product.origin,
        roastLevel: product.roast_level,
        intensity: product.intensity,
        weight: 250,
        isFeatured: product.is_featured || false,
      }];
    }

    return variants.map(variant => ({
      id: `${product.id}-${variant.weight}`,
      productId: product.id,
      variantId: variant.id,
      name: `${product.name} (${variant.weight}g)`,
      slug: product.slug,
      price: variant.price,
      comparePrice: variant.compare_at_price,
      image: product.image_url || '/placeholder.svg',
      category: product.category,
      description: product.description || '',
      flavorNotes: product.flavor_notes || [],
      inStock: (variant.stock_quantity ?? 0) > 0,
      origin: product.origin,
      roastLevel: product.roast_level,
      intensity: product.intensity,
      weight: variant.weight,
      isFeatured: product.is_featured || false,
    }));
  });
}

// Get unique categories from products
export function getCategories(products: DatabaseProduct[]): { id: string; name: string; count: number }[] {
  const categoryMap = new Map<string, number>();
  
  products.forEach(product => {
    const category = product.category;
    categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  });

  return Array.from(categoryMap.entries()).map(([name, count]) => ({
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    count,
  }));
}

// Main hook
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook for featured products only
export function useFeaturedProducts() {
  const { data: products, ...rest } = useProducts();
  
  const featuredProducts = products
    ? getUniqueProducts(products).filter(p => p.isFeatured)
    : [];

  return { data: featuredProducts, ...rest };
}

// Hook for products by category
export function useProductsByCategory(category: string | null) {
  const { data: products, ...rest } = useProducts();
  
  const filteredProducts = products
    ? getUniqueProducts(products).filter(p => 
        !category || p.category.toLowerCase().replace(/\s+/g, '-') === category.toLowerCase()
      )
    : [];

  return { data: filteredProducts, ...rest };
}
