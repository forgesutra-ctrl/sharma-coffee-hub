// The one rule for a product's advertised "from ₹X" price. Every listing that shows
// a from-price must go through getFromPrice so it matches what the product page sells.
//
// - A product with active child products (e.g. Gold Blend -> Gold blend 1/2/3) is sold
//   only through its children: the product page selects a child, and the parent's own
//   variants are never offered. So the price comes from the active children's variants.
// - Otherwise it comes from the product's own variants.
// - Only purchasable variants count. Variants have no is_active column; a variant is
//   purchasable when its product is active and stock_quantity > 0, because the product
//   page disables Add to Cart at stock_quantity <= 0.
// - If nothing is purchasable, the lowest price of the candidate variants is returned
//   with purchasable: false, so a sold-out product still shows a price next to its
//   "Sold Out" state rather than none.

export type PricingVariant = { price: number; stock_quantity: number | null };
export type PricingChild = { is_active: boolean | null; product_variants: PricingVariant[] | null };
export type PricingSource = {
  product_variants?: PricingVariant[] | null;
  /** Active and inactive children, as embedded by CHILD_PRICING_SELECT. */
  child_pricing?: PricingChild[] | null;
};

/** PostgREST embed that supplies child_pricing; add it to any products select used for listings. */
export const CHILD_PRICING_SELECT =
  'child_pricing:products!parent_product_id(is_active, product_variants(price, stock_quantity))';

export function getFromPrice(product: PricingSource): { price: number; purchasable: boolean } | null {
  const activeChildren = (product.child_pricing ?? []).filter((c) => c.is_active);
  const candidates = activeChildren.length > 0
    ? activeChildren.flatMap((c) => c.product_variants ?? [])
    : product.product_variants ?? [];
  if (candidates.length === 0) return null;

  const purchasable = candidates.filter((v) => (v.stock_quantity ?? 0) > 0);
  const pool = purchasable.length > 0 ? purchasable : candidates;
  return { price: Math.min(...pool.map((v) => v.price)), purchasable: purchasable.length > 0 };
}
