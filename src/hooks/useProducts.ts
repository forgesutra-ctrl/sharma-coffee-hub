import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductVariant {
  id: string;
  product_id: string;
  weight: number;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number | null;
  cod_enabled: boolean | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean | null;
  sort_order: number | null;
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
}

export interface DatabaseProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  category_id: string | null;
  parent_product_id: string | null;
  image_url: string | null;
  origin: string | null;
  roast_level: string | null;
  flavor_notes: string[] | null;
  intensity: number | null;
  is_featured: boolean | null;
  is_active: boolean | null;
  subscription_eligible?: boolean | null;
  subscription_discount_percentage?: number | null;
  created_at: string;
  updated_at: string;
  product_variants: ProductVariant[];
  product_images?: ProductImage[];
  child_products?: DatabaseProduct[];
  categories?: CategoryInfo | null;
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
  categorySlug: string | null;
  description: string;
  flavorNotes: string[];
  inStock: boolean;
  origin: string | null;
  roastLevel: string | null;
  intensity: number | null;
  weight: number;
  isFeatured: boolean;
  subscription_eligible?: boolean;
  subscription_discount_percentage?: number;
}

// Fetch all active products with their variants (only parent products)
async function fetchProducts(): Promise<DatabaseProduct[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        category,
        category_id,
        parent_product_id,
        image_url,
        origin,
        roast_level,
        flavor_notes,
        intensity,
        is_featured,
        is_active,
        subscription_eligible,
        subscription_discount_percentage,
        created_at,
        updated_at,
        categories (
          id,
          name,
          slug
        ),
        product_variants (
          id,
          product_id,
          weight,
          price,
          compare_at_price,
          stock_quantity,
          cod_enabled
        ),
        product_images (
          id,
          product_id,
          image_url,
          is_primary,
          sort_order
        )
      `)
      .eq('is_active', true)
      .is('parent_product_id', null)
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as DatabaseProduct[]) || [];
  } catch (err) {
    console.error('Failed to fetch products:', err);
    return [];
  }
}

// Fetch single product by slug with all related data including child products
async function fetchProductBySlug(slug: string): Promise<DatabaseProduct | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        category,
        category_id,
        parent_product_id,
        image_url,
        origin,
        roast_level,
        flavor_notes,
        intensity,
        is_featured,
        is_active,
        subscription_eligible,
        subscription_discount_percentage,
        created_at,
        updated_at,
        categories (
          id,
          name,
          slug
        ),
        product_variants (
          id,
          product_id,
          weight,
          price,
          compare_at_price,
          stock_quantity,
          cod_enabled
        ),
        product_images (
          id,
          product_id,
          image_url,
          is_primary,
          sort_order
        )
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;

    // If this is a parent product, fetch child products
    if (data) {
      const { data: childData, error: childError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          description,
          category,
          category_id,
          parent_product_id,
          image_url,
          origin,
          roast_level,
          flavor_notes,
          intensity,
          is_featured,
          is_active,
          subscription_eligible,
          subscription_discount_percentage,
          created_at,
          updated_at,
          categories (
            id,
            name,
            slug
          ),
          product_variants (
            id,
            product_id,
            weight,
            price,
            compare_at_price,
            stock_quantity,
            cod_enabled
          ),
          product_images (
            id,
            product_id,
            image_url,
            is_primary,
            sort_order
          )
        `)
        .eq('parent_product_id', data.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!childError && childData) {
        (data as any).child_products = childData;
      }
    }

    return data as DatabaseProduct | null;
  } catch (err) {
    console.error('Failed to fetch product by slug:', err);
    return null;
  }
}

// Fetch products by category ID (only parent products)
async function fetchProductsByCategoryId(categoryId: string): Promise<DatabaseProduct[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        slug,
        description,
        category,
        category_id,
        parent_product_id,
        image_url,
        origin,
        roast_level,
        flavor_notes,
        intensity,
        is_featured,
        is_active,
        subscription_eligible,
        subscription_discount_percentage,
        created_at,
        updated_at,
        categories (
          id,
          name,
          slug
        ),
        product_variants (
          id,
          product_id,
          weight,
          price,
          compare_at_price,
          stock_quantity,
          cod_enabled
        ),
        product_images (
          id,
          product_id,
          image_url,
          is_primary,
          sort_order
        )
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .is('parent_product_id', null)
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as DatabaseProduct[]) || [];
  } catch (err) {
    console.error('Failed to fetch products by category:', err);
    return [];
  }
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
      category: product.categories?.name || product.category,
      categorySlug: product.categories?.slug || null,
      description: product.description || '',
      flavorNotes: product.flavor_notes || [],
      inStock: variants.length > 0 && variants.some(v => (v.stock_quantity ?? 0) > 0),
      origin: product.origin,
      roastLevel: product.roast_level,
      intensity: product.intensity,
      weight: lowestPriceVariant?.weight || 250,
      isFeatured: product.is_featured || false,
      subscription_eligible: product.subscription_eligible || false,
      subscription_discount_percentage: product.subscription_discount_percentage || undefined,
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
        category: product.categories?.name || product.category,
        categorySlug: product.categories?.slug || null,
        description: product.description || '',
        flavorNotes: product.flavor_notes || [],
        inStock: false,
        origin: product.origin,
        roastLevel: product.roast_level,
        intensity: product.intensity,
        weight: 250,
        isFeatured: product.is_featured || false,
        subscription_eligible: product.subscription_eligible || false,
        subscription_discount_percentage: product.subscription_discount_percentage || undefined,
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
      category: product.categories?.name || product.category,
      categorySlug: product.categories?.slug || null,
      description: product.description || '',
      flavorNotes: product.flavor_notes || [],
      inStock: (variant.stock_quantity ?? 0) > 0,
      origin: product.origin,
      roastLevel: product.roast_level,
      intensity: product.intensity,
      weight: variant.weight,
      isFeatured: product.is_featured || false,
      subscription_eligible: product.subscription_eligible || false,
      subscription_discount_percentage: product.subscription_discount_percentage || undefined,
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

// Hook for products by category (using category slug)
export function useProductsByCategory(category: string | null) {
  const { data: products, ...rest } = useProducts();

  const filteredProducts = products
    ? getUniqueProducts(products).filter(p =>
        !category || p.category.toLowerCase().replace(/\s+/g, '-') === category.toLowerCase()
      )
    : [];

  return { data: filteredProducts, ...rest };
}

// Hook for single product by slug
export function useProductBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => slug ? fetchProductBySlug(slug) : Promise.resolve(null),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook for products by category ID
export function useProductsByCategoryId(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['products-by-category', categoryId],
    queryFn: () => categoryId ? fetchProductsByCategoryId(categoryId) : Promise.resolve([]),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5,
  });
}

// Hook to get product variants for a specific product
export function useProductVariants(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      if (!productId) return [];

      try {
        const { data, error } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', productId)
          .order('weight', { ascending: true });

        if (error) throw error;
        return (data as ProductVariant[]) || [];
      } catch (err) {
        console.error('Failed to fetch product variants:', err);
        return [];
      }
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
  });
}

// Check if product has variants (parent product)
export function isParentProduct(product: DatabaseProduct | null): boolean {
  if (!product) return false;
  return (product.product_variants?.length || 0) === 0;
}

// Check if product is purchasable (has variants)
export function isPurchasableProduct(product: DatabaseProduct | null): boolean {
  if (!product) return false;
  return (product.product_variants?.length || 0) > 0;
}
