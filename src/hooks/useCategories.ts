import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  product_count?: number;
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as Category[]) || [];
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    return [];
  }
}

async function fetchCategoriesWithProductCount(): Promise<Category[]> {
  try {
    const categories = await fetchCategories();

    const { data: products } = await supabase
      .from('products')
      .select('id, category_id')
      .eq('is_active', true);

    const productCountMap = new Map<string, number>();
    products?.forEach(product => {
      if (product.category_id) {
        productCountMap.set(
          product.category_id,
          (productCountMap.get(product.category_id) || 0) + 1
        );
      }
    });

    return categories.map(cat => ({
      ...cat,
      product_count: productCountMap.get(cat.id) || 0,
    }));
  } catch (err) {
    console.error('Failed to fetch categories with count:', err);
    return [];
  }
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });
}

export function useCategoriesWithCount() {
  return useQuery({
    queryKey: ['categories-with-count'],
    queryFn: fetchCategoriesWithProductCount,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCategoryBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      if (!slug) return null;

      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Failed to fetch category by slug:', err);
        return null;
      }
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });
}
