// Product sections with grouped variants - NOT separate product cards

export interface ProductVariant {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  image: string;
  images?: string[];
  flavorNotes: string[];
  origin?: string;
  roastLevel?: string;
  chicoryPercent?: number;
  intensity?: number; // 1-5
}

export interface PackSize {
  weight: number; // in grams
  price: number;
  comparePrice?: number;
}

export interface GrindOption {
  id: string;
  name: string;
  description?: string;
}

export interface ProductSection {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  heroImage: string;
  heroVideo?: string;
  variants: ProductVariant[];
  packSizes: PackSize[];
  grindOptions: GrindOption[];
  brewingMethods?: string[];
  storageTips?: string;
  ingredients?: string;
  category: 'filter-coffee' | 'specialty' | 'instant' | 'other';
}

// Grind options shared across products
export const grindOptions: GrindOption[] = [
  { id: 'whole-bean', name: 'Whole Bean', description: 'For grinding fresh at home' },
  { id: 'filter-grind', name: 'Filter Grind', description: 'Perfect for South Indian filter' },
  { id: 'espresso-grind', name: 'Espresso Grind', description: 'Fine grind for espresso machines' },
  { id: 'french-press', name: 'French Press', description: 'Coarse grind for immersion brewing' },
];

// FILTER COFFEE BLENDS - Single section with multiple blend variants
export const filterCoffeeSection: ProductSection = {
  id: 'filter-coffee-blends',
  slug: 'filter-coffee-blends',
  title: 'Filter Coffee Blends',
  subtitle: 'Traditional South Indian Coffee',
  description: 'Our signature filter coffee blends, crafted from premium Coorg Arabica and Robusta beans. Each blend is carefully roasted to bring out the authentic South Indian filter coffee experience.',
  heroImage: 'https://images.pexels.com/photos/4350057/pexels-photo-4350057.jpeg',
  heroVideo: 'https://videos.pexels.com/video-files/5520810/5520810-hd_1920_1080_30fps.mp4',
  category: 'filter-coffee',
  variants: [
    {
      id: 'coorg-classic',
      name: 'Coorg Classic Blend',
      description: 'Our foundational blend that built Sharma Coffee Works over 40 years. Balanced Arabica and Robusta with traditional chicory. Full-bodied, aromatic, perfect with milk.',
      price: 380,
      image: 'https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg',
      flavorNotes: ['Bold', 'Nutty', 'Traditional'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      chicoryPercent: 20,
      intensity: 4,
    },
    {
      id: 'gold-blend',
      name: 'Gold Blend - 20% Chicory',
      description: 'Gold Blend is stronger and gives a thicker, more viscous cup. Premium beans from Coorg estates with the traditional balanced chicory ratio.',
      price: 450,
      image: 'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg',
      flavorNotes: ['Rich', 'Strong', 'Smooth'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium-Dark',
      chicoryPercent: 20,
      intensity: 5,
    },
    {
      id: 'premium-blend',
      name: 'Premium Blend - 10% Chicory',
      description: 'Premium Blend uses select high-altitude beans from premium Coorg estates. More complex flavor, smoother finish than Gold Blend.',
      price: 520,
      comparePrice: 580,
      image: 'https://images.pexels.com/photos/2067628/pexels-photo-2067628.jpeg',
      flavorNotes: ['Complex', 'Aromatic', 'Subtle'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      chicoryPercent: 10,
      intensity: 3,
    },
    {
      id: 'royal-caffeine',
      name: 'Royal Caffeine - No Chicory',
      description: 'Pure Arabica-Robusta blend with no chicory. Maximum caffeine, bold flavor, clean finish. For those who want coffee without any additives.',
      price: 480,
      image: 'https://images.pexels.com/photos/4350057/pexels-photo-4350057.jpeg',
      flavorNotes: ['Bold', 'Pure', 'Intense'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Dark',
      chicoryPercent: 0,
      intensity: 5,
    },
  ],
  packSizes: [
    { weight: 250, price: 0 }, // base price
    { weight: 500, price: 180 }, // additional cost
    { weight: 1000, price: 320 }, // additional cost
  ],
  grindOptions: grindOptions,
  brewingMethods: ['South Indian Filter', 'French Press', 'Pour Over', 'Moka Pot'],
  storageTips: 'Store in an airtight container away from direct sunlight and moisture. Best consumed within 30 days of opening.',
  ingredients: 'Roasted Coffee Beans (Arabica & Robusta), Chicory (where applicable)',
};

// SPECIALTY BLENDS - Single section with 3 selectable options (as per requirement)
export const specialtyBlendsSection: ProductSection = {
  id: 'specialty-blends',
  slug: 'specialty-blends',
  title: 'Specialty Blends',
  subtitle: 'Single Origin Excellence',
  description: 'Curated single-origin coffees from the finest estates. Each blend tells a story of terroir, craftsmanship, and passion.',
  heroImage: 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg',
  heroVideo: 'https://videos.pexels.com/video-files/6231811/6231811-hd_1920_1080_30fps.mp4',
  category: 'specialty',
  variants: [
    {
      id: 'specialty-blend-1',
      name: 'Monsoon Malabar',
      description: 'Legendary Monsoon Malabar beans exposed to monsoon winds. Low acidity, earthy tones, with hints of spice and chocolate. A truly unique Indian coffee experience.',
      price: 650,
      image: 'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg',
      flavorNotes: ['Earthy', 'Spicy', 'Chocolate'],
      origin: 'Malabar Coast, Kerala',
      roastLevel: 'Medium',
      intensity: 4,
    },
    {
      id: 'specialty-blend-2',
      name: 'Chikmagalur Estate',
      description: 'Single estate coffee from the birthplace of Indian coffee. Bright acidity, fruity notes, with a wine-like complexity. Shade-grown under jackfruit and cardamom trees.',
      price: 720,
      image: 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg',
      flavorNotes: ['Fruity', 'Wine-like', 'Complex'],
      origin: 'Chikmagalur, Karnataka',
      roastLevel: 'Light-Medium',
      intensity: 3,
    },
    {
      id: 'specialty-blend-3',
      name: 'Araku Valley Reserve',
      description: 'Organic coffee from the pristine Araku Valley. Grown by tribal farmers using traditional methods. Sweet, nutty, with caramel undertones.',
      price: 780,
      comparePrice: 850,
      image: 'https://images.pexels.com/photos/2067628/pexels-photo-2067628.jpeg',
      flavorNotes: ['Sweet', 'Nutty', 'Caramel'],
      origin: 'Araku Valley, Andhra Pradesh',
      roastLevel: 'Medium',
      intensity: 3,
    },
  ],
  packSizes: [
    { weight: 200, price: 0 },
    { weight: 400, price: 320 },
  ],
  grindOptions: grindOptions,
  brewingMethods: ['Pour Over', 'Aeropress', 'Chemex', 'French Press'],
  storageTips: 'Store in an airtight container in a cool, dark place. Best consumed within 21 days of roasting.',
};

// INSTANT COFFEE / DECOCTIONS - Grouped variants
export const instantCoffeeSection: ProductSection = {
  id: 'instant-coffee',
  slug: 'instant-coffee-decoctions',
  title: 'Instant Filter Coffee',
  subtitle: 'Ready-to-Use Decoctions',
  description: 'Experience authentic filter coffee taste in seconds. Our liquid decoctions capture the essence of freshly brewed filter coffee.',
  heroImage: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
  category: 'instant',
  variants: [
    {
      id: 'classic-decoction',
      name: 'Classic Decoction',
      description: 'Traditional filter coffee decoction. Just add hot milk and sugar. Ready in 6 seconds.',
      price: 220,
      image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
      flavorNotes: ['Classic', 'Authentic', 'Balanced'],
      intensity: 4,
    },
    {
      id: 'strong-decoction',
      name: 'Strong Brew Decoction',
      description: 'Extra strength decoction for those who like it strong. Double the coffee, double the kick.',
      price: 280,
      image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
      flavorNotes: ['Strong', 'Bold', 'Intense'],
      intensity: 5,
    },
    {
      id: 'cold-brew-concentrate',
      name: 'Cold Brew Concentrate',
      description: 'Slow-steeped for 18 hours. Smooth, low-acid, perfect over ice or with milk.',
      price: 350,
      image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
      flavorNotes: ['Smooth', 'Low-Acid', 'Refreshing'],
      intensity: 3,
    },
  ],
  packSizes: [
    { weight: 200, price: 0 }, // ml
    { weight: 500, price: 150 },
    { weight: 1000, price: 280 },
  ],
  grindOptions: [], // Not applicable for liquid
  storageTips: 'Refrigerate after opening. Best consumed within 7 days.',
};

// OTHER PRODUCTS - Grouped by type
export const otherProductsSection: ProductSection = {
  id: 'other-products',
  slug: 'other-products',
  title: 'Beyond Coffee',
  subtitle: 'Curated Selections',
  description: 'Explore our carefully curated selection of coffee-adjacent products, wellness items, and brewing equipment.',
  heroImage: 'https://images.pexels.com/photos/1493080/pexels-photo-1493080.jpeg',
  category: 'other',
  variants: [
    {
      id: 'coffee-honey',
      name: 'Coffee Blossom Honey',
      description: 'Pure honey harvested from bees that pollinate coffee plantations. Unique floral notes with hints of coffee.',
      price: 450,
      image: 'https://images.pexels.com/photos/1493080/pexels-photo-1493080.jpeg',
      flavorNotes: ['Floral', 'Sweet', 'Unique'],
    },
    {
      id: 'filter-set',
      name: 'Traditional Filter Set',
      description: 'Stainless steel South Indian filter with tumbler and davara. The authentic way to brew filter coffee.',
      price: 650,
      image: 'https://images.pexels.com/photos/4350057/pexels-photo-4350057.jpeg',
      flavorNotes: [],
    },
    {
      id: 'coffee-chocolate',
      name: 'Coffee Dark Chocolate',
      description: '70% dark chocolate infused with our signature coffee. The perfect pairing.',
      price: 280,
      image: 'https://images.pexels.com/photos/1493080/pexels-photo-1493080.jpeg',
      flavorNotes: ['Rich', 'Bitter-Sweet', 'Coffee'],
    },
  ],
  packSizes: [],
  grindOptions: [],
};

// All sections for easy access
export const allProductSections: ProductSection[] = [
  filterCoffeeSection,
  specialtyBlendsSection,
  instantCoffeeSection,
  otherProductsSection,
];

// Category descriptions for homepage
export const categoryCards = [
  {
    id: 'filter-coffee',
    title: 'Filter Coffee Blends',
    description: 'Traditional South Indian filter coffee',
    image: 'https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg',
    link: '/shop/filter-coffee-blends',
  },
  {
    id: 'specialty',
    title: 'Specialty Blends',
    description: 'Single origin excellence',
    image: 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg',
    link: '/shop/specialty-blends',
  },
  {
    id: 'instant',
    title: 'Instant Decoctions',
    description: 'Ready in 6 seconds',
    image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
    link: '/shop/instant-coffee-decoctions',
  },
  {
    id: 'other',
    title: 'Beyond Coffee',
    description: 'Honey, chocolate & more',
    image: 'https://images.pexels.com/photos/1493080/pexels-photo-1493080.jpeg',
    link: '/shop/other-products',
  },
];
