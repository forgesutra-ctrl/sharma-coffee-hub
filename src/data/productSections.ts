// Product sections with grouped variants - using real Sharma Coffee Works data
import coorgClassicImg from '@/assets/products/coorg-classic.png';
import goldBlendImg from '@/assets/products/gold-blend.png';
import premiumBlendImg from '@/assets/products/premium-blend.png';
import specialtyBlendImg from '@/assets/products/specialty-blend.png';
import royalCaffeineImg from '@/assets/products/royal-caffeine.png';
import coffeeChocolateImg from '@/assets/products/coffee-chocolate.jpg';

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
  arabicaPercent?: number;
  robustaPercent?: number;
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
  category: 'filter-coffee' | 'specialty' | 'royal-caffeine' | 'instant' | 'other';
}

// Grind options shared across products
export const grindOptions: GrindOption[] = [
  { id: 'whole-bean', name: 'Whole Bean', description: 'For grinding fresh at home' },
  { id: 'filter-grind', name: 'Filter Grind', description: 'Perfect for South Indian filter' },
  { id: 'espresso-grind', name: 'Espresso Grind', description: 'Fine grind for espresso machines' },
  { id: 'french-press', name: 'French Press', description: 'Coarse grind for immersion brewing' },
];

// COORG CLASSIC - Entry level blend
export const coorgClassicSection: ProductSection = {
  id: 'coorg-classic',
  slug: 'coorg-classic',
  title: 'Coorg Classic',
  subtitle: 'Non-Filter Blend',
  description: 'Our signature entry-level blend, perfect for everyday coffee lovers. A harmonious mix of Arabica and Robusta with chicory.',
  heroImage: coorgClassicImg,
  category: 'filter-coffee',
  variants: [
    {
      id: 'coorg-classic-1kg',
      name: 'Coorg Classic',
      description: 'Our foundational blend that built Sharma Coffee Works. Balanced Arabica and Robusta with traditional chicory. Full-bodied, aromatic, perfect with milk.',
      price: 800,
      image: coorgClassicImg,
      flavorNotes: ['Bold', 'Nutty', 'Traditional'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      arabicaPercent: 15,
      robustaPercent: 65,
      chicoryPercent: 20,
      intensity: 4,
    },
  ],
  packSizes: [
    { weight: 250, price: 200 },
    { weight: 500, price: 400 },
    { weight: 1000, price: 800 },
  ],
  grindOptions: grindOptions,
  brewingMethods: ['South Indian Filter', 'French Press', 'Moka Pot'],
  storageTips: 'Store in an airtight container away from direct sunlight and moisture. Best consumed within 30 days of opening.',
  ingredients: 'Roasted Coffee Beans (15% Arabica + 65% Robusta), Chicory (20%)',
};

// GOLD BLEND - 70% Robusta + 30% Arabica with varying chicory
export const goldBlendSection: ProductSection = {
  id: 'gold-blend',
  slug: 'gold-blend',
  title: 'Gold Blend',
  subtitle: '70% Robusta + 30% Arabica',
  description: 'Premium blend with balanced Arabica and Robusta for a smoother, more aromatic experience. Available in three chicory variations.',
  heroImage: goldBlendImg,
  category: 'filter-coffee',
  variants: [
    {
      id: 'gold-blend-1',
      name: 'Gold Blend 1 - 30% Chicory',
      description: 'Rich and bold with traditional chicory ratio. The classic South Indian filter coffee experience.',
      price: 760,
      image: goldBlendImg,
      flavorNotes: ['Rich', 'Bold', 'Classic'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium-Dark',
      arabicaPercent: 30,
      robustaPercent: 70,
      chicoryPercent: 30,
      intensity: 5,
    },
    {
      id: 'gold-blend-2',
      name: 'Gold Blend 2 - 20% Chicory',
      description: 'Balanced blend with moderate chicory. Smooth and aromatic with a clean finish.',
      price: 800,
      image: goldBlendImg,
      flavorNotes: ['Smooth', 'Balanced', 'Aromatic'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      arabicaPercent: 30,
      robustaPercent: 70,
      chicoryPercent: 20,
      intensity: 4,
    },
    {
      id: 'gold-blend-3',
      name: 'Gold Blend 3 - 10% Chicory',
      description: 'More coffee-forward with subtle chicory notes. For those who prefer a purer coffee taste.',
      price: 840,
      image: goldBlendImg,
      flavorNotes: ['Coffee-Forward', 'Subtle', 'Pure'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      arabicaPercent: 30,
      robustaPercent: 70,
      chicoryPercent: 10,
      intensity: 4,
    },
  ],
  packSizes: [
    { weight: 250, price: 190 },
    { weight: 500, price: 380 },
    { weight: 1000, price: 760 },
  ],
  grindOptions: grindOptions,
  brewingMethods: ['South Indian Filter', 'French Press', 'Pour Over', 'Moka Pot'],
  storageTips: 'Store in an airtight container away from direct sunlight and moisture. Best consumed within 30 days of opening.',
  ingredients: 'Roasted Coffee Beans (70% Robusta + 30% Arabica), Chicory (10-30%)',
};

// PREMIUM BLEND - 60% Arabica + 40% Robusta with varying chicory
export const premiumBlendSection: ProductSection = {
  id: 'premium-blend',
  slug: 'premium-blend',
  title: 'Premium Blend',
  subtitle: '60% Arabica + 40% Robusta',
  description: 'Our premium offering with higher Arabica content for those who appreciate finer coffee notes. Available in three chicory variations.',
  heroImage: premiumBlendImg,
  category: 'filter-coffee',
  variants: [
    {
      id: 'premium-blend-1',
      name: 'Premium Blend 1 - 30% Chicory',
      description: 'Premium beans with traditional chicory balance. Rich and full-bodied.',
      price: 780,
      image: premiumBlendImg,
      flavorNotes: ['Rich', 'Full-Bodied', 'Traditional'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      arabicaPercent: 60,
      robustaPercent: 40,
      chicoryPercent: 30,
      intensity: 4,
    },
    {
      id: 'premium-blend-2',
      name: 'Premium Blend 2 - 20% Chicory',
      description: 'Balanced premium blend highlighting the Arabica complexity with moderate chicory.',
      price: 840,
      image: premiumBlendImg,
      flavorNotes: ['Complex', 'Aromatic', 'Balanced'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      arabicaPercent: 60,
      robustaPercent: 40,
      chicoryPercent: 20,
      intensity: 3,
    },
    {
      id: 'premium-blend-3',
      name: 'Premium Blend 3 - 10% Chicory',
      description: 'Maximum coffee flavor with minimal chicory. Showcases the premium Arabica character.',
      price: 880,
      image: premiumBlendImg,
      flavorNotes: ['Premium', 'Nuanced', 'Refined'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      arabicaPercent: 60,
      robustaPercent: 40,
      chicoryPercent: 10,
      intensity: 3,
    },
  ],
  packSizes: [
    { weight: 250, price: 195 },
    { weight: 500, price: 390 },
    { weight: 1000, price: 780 },
  ],
  grindOptions: grindOptions,
  brewingMethods: ['South Indian Filter', 'Pour Over', 'French Press', 'Moka Pot'],
  storageTips: 'Store in an airtight container in a cool, dark place. Best consumed within 30 days of opening.',
  ingredients: 'Roasted Coffee Beans (60% Arabica + 40% Robusta), Chicory (10-30%)',
};

// SPECIALTY BLENDS - 100% Arabica with varying chicory
export const specialtyBlendsSection: ProductSection = {
  id: 'specialty-blends',
  slug: 'specialty-blends',
  title: 'Specialty Blend',
  subtitle: '100% Arabica',
  description: 'Our finest offering featuring 100% Arabica coffee from select Coorg estates. Available in three chicory variations to suit different taste preferences.',
  heroImage: specialtyBlendImg,
  category: 'specialty',
  variants: [
    {
      id: 'specialty-blend-1',
      name: 'Specialty Blend 1 - 30% Chicory',
      description: '70% Arabica blended with 30% Chicory. Rich, aromatic, with traditional South Indian character.',
      price: 860,
      image: specialtyBlendImg,
      flavorNotes: ['Aromatic', 'Rich', 'Traditional'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      arabicaPercent: 70,
      robustaPercent: 0,
      chicoryPercent: 30,
      intensity: 4,
    },
    {
      id: 'specialty-blend-2',
      name: 'Specialty Blend 2 - 20% Chicory',
      description: '80% Arabica blended with 20% Chicory. Balanced with pronounced coffee notes.',
      price: 900,
      image: specialtyBlendImg,
      flavorNotes: ['Balanced', 'Complex', 'Smooth'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      arabicaPercent: 80,
      robustaPercent: 0,
      chicoryPercent: 20,
      intensity: 3,
    },
    {
      id: 'specialty-blend-3',
      name: 'Specialty Blend 3 - 10% Chicory',
      description: '90% Arabica blended with 10% Chicory. Maximum Arabica flavor, subtle chicory undertones.',
      price: 940,
      image: specialtyBlendImg,
      flavorNotes: ['Pure', 'Nuanced', 'Elegant'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Light-Medium',
      arabicaPercent: 90,
      robustaPercent: 0,
      chicoryPercent: 10,
      intensity: 3,
    },
  ],
  packSizes: [
    { weight: 250, price: 215 },
    { weight: 500, price: 430 },
    { weight: 1000, price: 860 },
  ],
  grindOptions: grindOptions,
  brewingMethods: ['Pour Over', 'Aeropress', 'Chemex', 'French Press', 'South Indian Filter'],
  storageTips: 'Store in an airtight container in a cool, dark place. Best consumed within 21 days of roasting.',
  ingredients: 'Roasted Coffee Beans (100% Arabica), Chicory (10-30%)',
};

// ROYAL CAFFEINE - 100% Pure Coffee (No Chicory)
export const royalCaffeineSection: ProductSection = {
  id: 'royal-caffeine',
  slug: 'royal-caffeine',
  title: 'Royal Caffeine',
  subtitle: '100% Pure Coffee - No Chicory',
  description: 'Our purest coffee range with no chicory added. Experience the authentic taste of single-origin and blended coffees in their purest form. For true coffee purists.',
  heroImage: royalCaffeineImg,
  category: 'royal-caffeine',
  variants: [
    {
      id: 'pure-arabica',
      name: 'Pure Arabica (100%)',
      description: '100% Pure Arabica beans from select Coorg estates. Mild, aromatic, with delicate flavor notes. Perfect for black coffee or light milk brewing.',
      price: 1120,
      image: royalCaffeineImg,
      flavorNotes: ['Mild', 'Aromatic', 'Delicate'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Light-Medium',
      arabicaPercent: 100,
      robustaPercent: 0,
      chicoryPercent: 0,
      intensity: 2,
    },
    {
      id: 'pure-robusta',
      name: 'Pure Robusta (100%)',
      description: '100% Pure Robusta for maximum caffeine and bold flavor. Strong, full-bodied, with intense coffee character.',
      price: 980,
      image: royalCaffeineImg,
      flavorNotes: ['Bold', 'Strong', 'Intense'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Dark',
      arabicaPercent: 0,
      robustaPercent: 100,
      chicoryPercent: 0,
      intensity: 5,
    },
    {
      id: 'arabica-robusta-50-50',
      name: 'Arabica + Robusta (50/50)',
      description: 'The perfect balance of Arabica smoothness and Robusta strength. Medium body with balanced flavor profile.',
      price: 1000,
      image: royalCaffeineImg,
      flavorNotes: ['Balanced', 'Medium-Body', 'Versatile'],
      origin: 'Coorg, Karnataka',
      roastLevel: 'Medium',
      arabicaPercent: 50,
      robustaPercent: 50,
      chicoryPercent: 0,
      intensity: 4,
    },
  ],
  packSizes: [
    { weight: 250, price: 250 },
    { weight: 500, price: 490 },
    { weight: 1000, price: 980 },
  ],
  grindOptions: grindOptions,
  brewingMethods: ['Pour Over', 'French Press', 'Espresso', 'Cold Brew', 'AeroPress'],
  storageTips: 'Store in an airtight container in a cool, dark place. Best consumed within 21 days of opening.',
  ingredients: '100% Roasted Coffee Beans (No Chicory)',
};

// INSTANT COFFEE / DECOCTIONS - 5 variants
export const instantCoffeeSection: ProductSection = {
  id: 'instant-coffee',
  slug: 'instant-coffee-decoctions',
  title: 'Instant Filter Coffee',
  subtitle: 'Ready-to-Use Decoctions',
  description: 'Experience authentic filter coffee taste in seconds. Our liquid decoctions capture the essence of freshly brewed filter coffee. Available in 5 blend variations.',
  heroImage: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
  category: 'instant',
  variants: [
    {
      id: 'gold-blend-decoction',
      name: 'Gold Blend Decoction',
      description: 'Ready-to-use Gold Blend filter coffee decoction. Rich and bold with traditional taste. Just add hot milk.',
      price: 180,
      image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
      flavorNotes: ['Rich', 'Bold', 'Traditional'],
      intensity: 4,
    },
    {
      id: 'premium-blend-decoction',
      name: 'Premium Blend Decoction',
      description: 'Ready-to-use Premium Blend filter coffee decoction with higher Arabica content. Smooth and aromatic.',
      price: 200,
      image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
      flavorNotes: ['Smooth', 'Aromatic', 'Premium'],
      intensity: 3,
    },
    {
      id: 'specialty-blend-decoction',
      name: 'Specialty Blend Decoction',
      description: '100% Arabica decoction for the discerning coffee lover. Complex and refined.',
      price: 220,
      image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
      flavorNotes: ['Pure', 'Complex', 'Refined'],
      intensity: 3,
    },
    {
      id: 'royal-caffeine-decoction',
      name: 'Royal Caffeine Decoction',
      description: 'No chicory pure coffee decoction for true coffee purists. Intense and bold.',
      price: 240,
      image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
      flavorNotes: ['Pure', 'Intense', 'Bold'],
      intensity: 5,
    },
    {
      id: 'classic-decoction',
      name: 'Classic Decoction',
      description: 'Traditional Coorg Classic filter coffee decoction. Everyday favorite. Just add hot milk and sugar.',
      price: 160,
      image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
      flavorNotes: ['Classic', 'Authentic', 'Balanced'],
      intensity: 4,
    },
  ],
  packSizes: [
    { weight: 200, price: 0 },
    { weight: 500, price: 150 },
    { weight: 1000, price: 280 },
  ],
  grindOptions: [],
  storageTips: 'Refrigerate after opening. Best consumed within 7 days.',
};

// OTHER PRODUCTS - Grouped by type (12 products total)
export const otherProductsSection: ProductSection = {
  id: 'other-products',
  slug: 'other-products',
  title: 'Beyond Coffee',
  subtitle: 'Curated Selections',
  description: 'Explore our carefully curated selection of coffee-based products, tea, wellness items from Coorg, and traditional brewing equipment.',
  heroImage: coffeeChocolateImg,
  category: 'other',
  variants: [
    // Coffee-Based Products
    {
      id: 'coffee-chocolate',
      name: 'Homemade Coffee Chocolate',
      description: 'Handcrafted chocolate infused with our signature coffee flavor. A perfect blend of rich cocoa and aromatic coffee.',
      price: 280,
      image: coffeeChocolateImg,
      flavorNotes: ['Rich', 'Coffee-Infused', 'Indulgent'],
    },
    {
      id: 'coffee-soap',
      name: 'Coffee Soap',
      description: 'Natural soap made with coffee extracts. Exfoliating and aromatic.',
      price: 150,
      image: coffeeChocolateImg,
      flavorNotes: ['Natural', 'Exfoliating', 'Aromatic'],
    },
    {
      id: 'coffee-oasis',
      name: 'Coffee Oasis',
      description: 'Refreshing coffee-based drink for a unique experience. A perfect summer beverage.',
      price: 180,
      image: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
      flavorNotes: ['Refreshing', 'Coffee-Infused', 'Unique'],
    },
    {
      id: 'coffee-wine',
      name: 'Homemade Coffee Wine',
      description: 'Unique artisanal wine crafted from coffee. A Sharma Coffee specialty and collector\'s delight.',
      price: 650,
      image: 'https://images.pexels.com/photos/2702805/pexels-photo-2702805.jpeg',
      flavorNotes: ['Artisanal', 'Unique', 'Premium'],
    },
    // Tea Products
    {
      id: 'gold-tea',
      name: 'Gold Tea Powder',
      description: 'Premium tea powder from the hills of Coorg. Rich and aromatic with a golden hue.',
      price: 320,
      image: 'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg',
      flavorNotes: ['Premium', 'Aromatic', 'Golden'],
    },
    {
      id: 'premium-tea',
      name: 'Premium Tea Powder',
      description: 'Fine quality tea powder for authentic chai experience. Strong and flavorful.',
      price: 400,
      image: 'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg',
      flavorNotes: ['Fine', 'Rich', 'Authentic'],
    },
    {
      id: 'pan-tea',
      name: 'Pan Tea Powder',
      description: 'Traditional pan-roasted tea with unique smoky flavor. A local favorite.',
      price: 280,
      image: 'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg',
      flavorNotes: ['Pan-Roasted', 'Traditional', 'Smoky'],
    },
    // Natural Products
    {
      id: 'coorg-honey',
      name: 'Coorg Honey',
      description: 'Pure honey sourced from the forests of Coorg. Natural and unprocessed.',
      price: 450,
      image: 'https://images.pexels.com/photos/1493080/pexels-photo-1493080.jpeg',
      flavorNotes: ['Pure', 'Natural', 'Floral'],
    },
    {
      id: 'organic-turmeric',
      name: 'Organic Turmeric Powder',
      description: 'Pure organic turmeric from Coorg\'s fertile lands. High curcumin content.',
      price: 180,
      image: 'https://images.pexels.com/photos/1493080/pexels-photo-1493080.jpeg',
      flavorNotes: ['Organic', 'Pure', 'Premium'],
    },
    {
      id: 'coffee-jams',
      name: 'Coffee & Natural Fruit Jams',
      description: 'Homemade jams combining coffee with natural fruits from Coorg. Perfect for breakfast.',
      price: 250,
      image: 'https://images.pexels.com/photos/1493080/pexels-photo-1493080.jpeg',
      flavorNotes: ['Fruity', 'Coffee-Infused', 'Artisanal'],
    },
    // Equipment
    {
      id: 'filter-set',
      name: 'Traditional Filter Set (Double Decker)',
      description: 'Stainless steel South Indian filter with tumbler and davara. The authentic way to brew filter coffee.',
      price: 650,
      image: 'https://images.pexels.com/photos/4350057/pexels-photo-4350057.jpeg',
      flavorNotes: [],
    },
    {
      id: 'percolator',
      name: 'Coffee Percolator',
      description: 'Traditional coffee percolator for brewing authentic filter coffee.',
      price: 450,
      image: 'https://images.pexels.com/photos/4350057/pexels-photo-4350057.jpeg',
      flavorNotes: [],
    },
  ],
  packSizes: [],
  grindOptions: [],
};

// All sections for easy access
export const allProductSections: ProductSection[] = [
  coorgClassicSection,
  goldBlendSection,
  premiumBlendSection,
  specialtyBlendsSection,
  royalCaffeineSection,
  instantCoffeeSection,
  otherProductsSection,
];

// Category descriptions for homepage
export const categoryCards = [
  {
    id: 'coorg-classic',
    title: 'Coorg Classic',
    description: '15% Arabica + 65% Robusta + 20% Chicory',
    image: coorgClassicImg,
    link: '/shop/coorg-classic',
    price: '₹800/kg',
  },
  {
    id: 'gold-blend',
    title: 'Gold Blend',
    description: '70% Robusta + 30% Arabica with Chicory',
    image: goldBlendImg,
    link: '/shop/gold-blend',
    price: 'From ₹760/kg',
  },
  {
    id: 'premium-blend',
    title: 'Premium Blend',
    description: '60% Arabica + 40% Robusta with Chicory',
    image: premiumBlendImg,
    link: '/shop/premium-blend',
    price: 'From ₹780/kg',
  },
  {
    id: 'specialty-blends',
    title: 'Specialty Blend',
    description: '100% Arabica with Chicory',
    image: specialtyBlendImg,
    link: '/shop/specialty-blends',
    price: 'From ₹860/kg',
  },
  {
    id: 'royal-caffeine',
    title: 'Royal Caffeine',
    description: '100% Pure Coffee - No Chicory',
    image: royalCaffeineImg,
    link: '/shop/royal-caffeine',
    price: 'From ₹980/kg',
  },
  {
    id: 'other',
    title: 'Beyond Coffee',
    description: 'Chocolate, Honey, Equipment & More',
    image: coffeeChocolateImg,
    link: '/shop/other-products',
  },
];
