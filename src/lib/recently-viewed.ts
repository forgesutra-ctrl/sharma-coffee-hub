const STORAGE_KEY = "recently_viewed_products";
const MAX_ITEMS = 10;

export function addRecentlyViewed(slug: string): void {
  if (!slug) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const slugs: string[] = raw ? JSON.parse(raw) : [];
    const filtered = slugs.filter((s) => s !== slug);
    const updated = [slug, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export function getRecentlyViewedSlugs(excludeSlug?: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const slugs: string[] = raw ? JSON.parse(raw) : [];
    return excludeSlug ? slugs.filter((s) => s !== excludeSlug) : slugs;
  } catch {
    return [];
  }
}
