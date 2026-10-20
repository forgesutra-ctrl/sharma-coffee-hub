// Site media, served from our own Supabase storage bucket.
//
// The redesign repo (coorg-s-golden-roast) loads these from a Lovable *preview*
// origin. That host is not a CDN and can disappear with the Lovable project, so
// everything is rehosted here instead. Bucket: `site-media` (public).
//
// Filenames below are exactly as they appear in the bucket.

const BUCKET =
  "https://api.sharmacoffeeworks.com/storage/v1/object/public/site-media";

const asset = (file: string) => `${BUCKET}/${file}`;

export type MediaAsset = {
  /** Primary source. WebM: small, and fine on Chrome, Edge, Firefox, Android. */
  url: string;
  /** H.264 fallback for Safari/iOS. Much larger — only fetched if WebM fails. */
  fallback?: string;
};

/* ---------- Films ---------- */

/** Hero film: the Coorg estate. */
export const estate: MediaAsset = {
  url: asset("estate.webm"),
  fallback: asset("coffee_estate.mp4"),
};

/** Hero film: the brewing ritual. */
export const brewing: MediaAsset = {
  url: asset("brewing.webm"),
  fallback: asset("coffee_brewing.mp4"),
};

/** The father-and-son portrait, gently animated. */
export const family: MediaAsset = {
  url: asset("family.webm"),
  fallback: asset("family_portrait.mp4"),
};

/* ---------- Posters (shown while a film loads) ---------- */

export const estatePoster: MediaAsset = { url: asset("coffee_estate.jpg") };
export const brewingPoster: MediaAsset = { url: asset("coffee_brewing.jpg") };
export const familyPoster: MediaAsset = { url: asset("sharma_family.jpg") };

/* ---------- Stills ---------- */

export const roasting: MediaAsset = { url: asset("coffee_roasting.jpg") };
export const logo: MediaAsset = { url: asset("scw-logo.webp") };

/* ---------- Reference product stills ---------- */
// Declared for completeness, but NOT used on the homepage. In the bucket, classic.png
// and gold.png are byte-identical, and so are premium.jpg and speciality.jpg (same
// size and ETag). Section 3 uses products.image_url instead, but the same duplication
// exists in the product images themselves (see CoffeeSection.tsx), so this alone
// does not give the four cards distinct photos.

export const classic: MediaAsset = { url: asset("classic.png") };
export const gold: MediaAsset = { url: asset("gold.png") };
export const premium: MediaAsset = { url: asset("premium.jpg") };
export const speciality: MediaAsset = { url: asset("speciality.jpg") };
