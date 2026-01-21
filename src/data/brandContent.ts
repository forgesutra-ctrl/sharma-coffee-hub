/**
 * Sharma Coffee Works - Complete Brand Content Dataset
 * Extracted and structured from official website
 * Source: https://www.sharmacoffeeworks.com/
 */

// ============================================
// A. GLOBAL BRAND INFORMATION
// ============================================

export const brandInfo = {
  name: "Sharma Coffee Works",
  tagline: "The Taste of Coorg",
  establishedYear: 1987,
  establishedText: "Since 1987",
  logo: "@/assets/sharma-coffee-logo.png",
  rating: 4.8,
  ratingSource: "JustDial",
  
  contact: {
    primaryPhone: "+91-8762988145",
    secondaryPhones: ["+91-6363235357", "+91-9448850596"],
    landline: "08272-229030",
    email: "ask@sharmacoffeeworks.com",
    whatsapp: "+918762988145",
  },
  
  locations: {
    retailStore: {
      name: "Madikeri Retail Store",
      address: "Sharma Coffee, Opposite to KSRTC Bus Stand, Bus Stand Road, Madikeri, Coorg, Karnataka 571201",
      city: "Madikeri",
      description: "Located in the heart of Madikeri, opposite the KSRTC bus stand",
      nickname: "Scotland of India / The Southern Kashmir",
    },
    manufacturingUnit: {
      name: "Mysore Manufacturing Unit",
      address: "Bogadi 2nd Stage, near Sangam Bhandar bus stop, Mysore",
      city: "Mysore",
      description: "State-of-the-art manufacturing facility",
      cityNickname: "The Heritage City / The Cultural Capital of Karnataka",
    },
  },
  
  businessHours: {
    weekdays: "Mon - Sat : 08:30 AM - 08:00 PM",
    sunday: "Sun : 09:30 AM - 02:00 PM",
  },
  
  socialMedia: {
    facebook: "https://www.facebook.com/Sharmacoffeeworks",
    justdial: "http://www.justdial.com/dt-99RGAWBU",
    justdialRating: "https://www.justdial.com/Coorg/Sharma-Coffee-Works-Madikeri/9999P8242-8242-110209130732-G3S8_BZDET",
  },
};

// ============================================
// B. ABOUT US / OUR STORY
// ============================================

export const aboutContent = {
  headline: "Generations of Coffee Roasters",
  
  introduction: `With a legacy spanning nearly 40 years, Sharma Coffee is a premium coffee roaster deeply rooted in South Indian traditions. We take pride in crafting exceptional ground coffee, catering to a discerning audience across India and overseas.

Our coffee is sourced from the finest plantations in Coorg, a region renowned for its lush landscapes and ideal coffee-growing conditions. Each bean is carefully selected and roasted to perfection, ensuring a rich, aromatic, and flavorful experience in every cup.`,

  retailStoreDescription: `Our retail store, located in the heart of Madikeri, opposite the KSRTC bus stand, offers coffee lovers a taste of Coorg's finest brews. Madikeri, often referred to as the "Scotland of India" and "The Southern Kashmir," provides the perfect setting for our heritage-rich brand.`,

  manufacturingDescription: `To meet the growing demand for our premium blends, we operate a state-of-the-art manufacturing unit in Mysore, a city celebrated as "The Heritage City" and "The Cultural Capital of Karnataka." Located at Bogadi 2nd Stage, near Sangam Bhandar bus stop, our facility ensures that every batch of Sharma Coffee maintains the highest quality standards.`,

  commitment: `At Sharma Coffee, we are committed to delivering authentic, high-quality coffee that reflects the rich coffee culture of South India.`,

  preSharmaStory: {
    title: "Pre Sharma Coffee Story",
    content: `Sri Vasant Rao, a respected member and employee of the Coorg Coffee Growers' Society, was widely known for his high ethical standards and principled lifestyle. Concerned that his eldest son, Sri Sridhar V, was not excelling academically, he, along with his close friends, encouraged Sridhar to explore an alternative path. At the time, Sridhar was juggling multiple roles as a part-time accountant, stenographer, and mechanic. Recognizing his potential, Sri Vasant Rao advised him to leave his job and pursue an independent venture—thus leading to the establishment of a small coffee roasting shop in Madikeri.`,
  },

  founder: {
    title: "Founder",
    name: "Sri Sridhar V.",
    year: 1987,
    content: `It all began in 1987 when our founder, Sri Sridhar V., took a bold step and established a small coffee business in Madikeri. With a vision for excellence and unwavering dedication, he laid the foundation for what would become a legacy in premium coffee roasting.

However, the journey was far from easy. On the very first day, Sridhar returned home in tears after earning just ₹32, convinced that this was not the path for him. Yet, his entrepreneurial spirit and passion for coffee kept him going. Decades of hard work, perseverance, and a commitment to quality have transformed Sharma Coffee into a brand that now spreads its rich aroma across 22 countries worldwide.`,
  },

  achievers: {
    title: "Achievers",
    name: "Mr. Varun Sharma",
    yearJoined: 2020,
    content: `In 2020, Mr. Varun Sharma joined the family business, carrying forward the legacy of his father with the same dedication to quality and excellence. As an integral part of Sharma Coffee, he oversees the day-to-day operations, ensuring that every product maintains its unparalleled flavor and consistency.

Over the years, Sharma Coffee has evolved into a fully integrated coffee enterprise, handling everything from procurement and manufacturing to transportation and retail. While coffee powder remains at the heart of the business, the brand has expanded into innovative coffee-based products, including coffee soaps, chocolates, jams, refreshment drinks, and even coffee wine.

With a commitment to craftsmanship and innovation, Sharma Coffee continues to redefine the coffee experience for enthusiasts worldwide.`,
  },

  wholesale: {
    title: "Wholesale",
    description: `Want to buy our coffee in bulk? We are more than happy to undertake large quantity orders – be it for cafe's, restaurants, events, caterers, retailers or any bulk requirements. Fill in the below form and we will get in touch with you shortly under 12 hours.`,
    responseTime: "12 hours",
  },
};

// ============================================
// C. ORIGIN & HERITAGE
// ============================================

export const heritageContent = {
  location: {
    title: "Location",
    subtitle: "India's Coffee District - Kodagu (Coorg)",
    description: `The mountains valleys and the lush coffee estates, a place with the legendary coffee background, Sharma Coffee was born in India's "Coffee district" – KODAGU (COORG).`,
  },

  mythologicalOrigin: {
    title: "The Legend of Coffee in India",
    content: `According to mythological history, a Sufi saint Bababudan on his pilgrimage to Mecca during 1600 AD visited Yemen. Here he discovered coffee being used as a sweetish drink by the Arabs, which he fell in love instantly and bought seven coffee seeds hidden in his robes. Later he planted the beans in the Chandragiri hills of Chikmagalur, which is near Coorg in Karnataka.

The beans spread quickly because the hilly areas of Coorg were ideal for growing coffee.`,
    year: "1600 AD",
    saint: "Sufi saint Bababudan",
    location: "Chandragiri hills of Chikmagalur",
  },

  britishEra: {
    title: "British-Era Plantations",
    content: `The British realized the potential of Coorg for growing coffee in the 19th century and established large-scale plantations. Today, Coorg is one of India's largest coffee producers, accounting for nearly 40% of Karnataka's total coffee production.`,
    coffeeProduction: "40% of Karnataka's total coffee production",
  },

  modernSignificance: {
    title: "Modern Coorg Coffee",
    coffeeVarieties: ["Arabica", "Robusta"],
    content: `The varieties grown in Coorg, mainly Arabica and Robusta, are in demand with both domestic and international buyers.`,
  },

  sustainability: {
    title: "Sustainability & Organic Practices",
    content: `Many plantations in Coorg have adopted organic farming techniques and fair-trade initiatives. Visitors can also take guided tours of the coffee estates to learn about the cultivation techniques and taste coffee.`,
  },
};

// ============================================
// D. PROCESSING & CRAFTSMANSHIP
// ============================================

export const processingContent = {
  headline: "Processing",
  introduction: `We expertise in the journey of coffee processing, from quality selection of coffee seeds that are processed into an aromatic sip enhancing a soulful experience.`,

  stages: [
    {
      id: "selection",
      title: "Selection",
      image: "@/assets/coffee-selection.jpg",
      content: `Coorg is well known worldwide for its fine coffee grown at sky kissing high altitudes. Only the finest quality and carefully cultivated clean coffees make their way into our roastery. The best quality beans from selective coffee plantations and curing works are used to extract its goodness to create delicate flavours in each stage of processing.`,
      highlights: [
        "Coffee grown at high altitudes",
        "Finest quality beans only",
        "Selective coffee plantations",
        "Careful cultivation practices",
      ],
    },
    {
      id: "roasting",
      title: "Roasting",
      image: "@/assets/coffee-beans-roasting.jpg",
      content: `Nature's not in a hurry. A coffee plant takes 3 years to mature and then yields only a pound of coffee each year. With so much at stake, we use a slow roasting method to coax the best from every bean. Sharma Coffee's processing plant is located in Madikeri and Mysore equipped with best Indian made Bharat Roasters. Under the guidance of expert coffee roasters, exceptional coffee beans are roasted to bring optimum aroma, flavor and complexity. Furthermore, a roasting process involves drying, roasting, and cooling. Each of these techniques is handled delicately to bring out a culinary masterpiece.`,
      highlights: [
        "Slow roasting method",
        "Bharat Roasters equipment",
        "Expert coffee roasters",
        "Drying, roasting, and cooling process",
        "Optimum aroma, flavor and complexity",
      ],
      equipment: "Bharat Roasters (Indian made)",
      locations: ["Madikeri", "Mysore"],
    },
    {
      id: "granulating",
      title: "Granulating",
      content: `After roasting, the beans are carefully granulated to the perfect consistency, ensuring optimal extraction during brewing.`,
      highlights: [
        "Perfect consistency",
        "Optimal extraction",
      ],
    },
    {
      id: "chicory-blending",
      title: "Chicory & Blending",
      content: `Our signature blends combine premium coffee with carefully proportioned chicory to create the authentic South Indian filter coffee taste that our customers love.`,
      highlights: [
        "Authentic South Indian taste",
        "Carefully proportioned blends",
        "Multiple chicory ratios available",
      ],
    },
    {
      id: "packing",
      title: "Packing",
      content: `Each batch is carefully packed to preserve freshness, aroma, and flavor until it reaches our customers.`,
      highlights: [
        "Freshness preserved",
        "Aroma protection",
        "Quality packaging",
      ],
    },
  ],
};

// ============================================
// E. BREWING GUIDE
// ============================================

export const brewingGuide = {
  title: "Brewing Guide",
  subtitle: "The Art of South Indian Filter Coffee",
  
  methods: [
    {
      id: "traditional-coorg",
      title: "Traditional Coorg Filter Coffee",
      description: "The authentic way to brew South Indian filter coffee using a traditional filter.",
      steps: [
        "Add 2-3 tablespoons of coffee powder to the upper chamber of the filter",
        "Press gently with the pressing disc",
        "Pour hot (not boiling) water slowly over the coffee",
        "Allow the decoction to drip for 10-15 minutes",
        "The decoction is ready when all water has filtered through",
      ],
      tips: [
        "Use freshly boiled water that has cooled for 30 seconds",
        "Don't press the coffee too hard",
        "Store decoction in the filter itself to keep warm",
      ],
    },
    {
      id: "milk-coffee",
      title: "Milk-Based Filter Coffee",
      description: "The classic South Indian way to serve filter coffee with frothy milk.",
      steps: [
        "Heat fresh milk until it begins to froth",
        "Take 1-2 tablespoons of strong coffee decoction",
        "Add sugar to taste",
        "Pour hot milk over the decoction",
        "Pour between two vessels (tumbler and dabara) to create froth",
      ],
      tips: [
        "Use full-fat milk for best results",
        "The pouring action from height creates the signature froth",
        "Serve immediately while hot",
      ],
      ratio: "1 part decoction : 3 parts milk",
    },
    {
      id: "black-coffee",
      title: "Black Coffee (Royal Caffeine)",
      description: "For purists who prefer their coffee without milk or chicory.",
      steps: [
        "Use Royal Caffeine range (100% pure coffee, no chicory)",
        "Prepare decoction using traditional filter method",
        "Dilute decoction with hot water to desired strength",
        "Add sugar if preferred",
      ],
      tips: [
        "Pure Arabica offers mild, aromatic notes",
        "Pure Robusta provides bold, strong flavor",
        "50/50 blend offers balanced taste",
      ],
    },
  ],

  culturalPractices: [
    "Coffee is traditionally served in a stainless steel tumbler and dabara set",
    "The pouring ritual between vessels is called 'meter coffee' or 'pulling coffee'",
    "Filter coffee is an integral part of South Indian hospitality",
    "Fresh decoction is prepared twice daily in traditional households",
  ],
};

// ============================================
// F. PRODUCTS (STRUCTURED, GROUPED)
// ============================================

export interface ProductVariant {
  id: string;
  name: string;
  arabicaPercent?: number;
  robustaPercent?: number;
  chicoryPercent?: number;
  pricePerKg: number;
  minQty: string;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  baseBlend?: string;
  variants: ProductVariant[];
  image: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  products: Product[];
}

export const productCategories: ProductCategory[] = [
  // 1. FILTER COFFEE BLENDS
  {
    id: "filter-coffee-blends",
    name: "Filter Coffee Blends",
    description: "Traditional South Indian filter coffee blends with chicory",
    products: [
      {
        id: "coorg-classic",
        name: "Coorg Classic",
        category: "Non-Filter",
        description: "Our signature entry-level blend, perfect for everyday coffee lovers. A harmonious mix of Arabica and Robusta with chicory.",
        baseBlend: "15% Arabica + 65% Robusta + 20% Chicory",
        image: "@/assets/products/coorg-classic.png",
        variants: [
          {
            id: "coorg-classic-1kg",
            name: "Coorg Classic (15% Arabica + 65% Robusta + 20% Chicory)",
            arabicaPercent: 15,
            robustaPercent: 65,
            chicoryPercent: 20,
            pricePerKg: 800,
            minQty: "1 Kilogram",
          },
        ],
      },
      {
        id: "gold-blend",
        name: "Gold Blend",
        category: "Filter Coffee",
        description: "Premium blend with higher Arabica content for a smoother, more aromatic experience.",
        baseBlend: "70% Robusta + 30% Arabica blended with Chicory",
        image: "@/assets/products/gold-blend.png",
        variants: [
          {
            id: "gold-blend-1",
            name: "Gold Blend 1 (70% Robusta + 30% Arabica + 30% Chicory)",
            arabicaPercent: 30,
            robustaPercent: 70,
            chicoryPercent: 30,
            pricePerKg: 760,
            minQty: "1 Kilogram",
          },
          {
            id: "gold-blend-2",
            name: "Gold Blend 2 (70% Robusta + 30% Arabica + 20% Chicory)",
            arabicaPercent: 30,
            robustaPercent: 70,
            chicoryPercent: 20,
            pricePerKg: 800,
            minQty: "1 Kilogram",
          },
          {
            id: "gold-blend-3",
            name: "Gold Blend 3 (70% Robusta + 30% Arabica + 10% Chicory)",
            arabicaPercent: 30,
            robustaPercent: 70,
            chicoryPercent: 10,
            pricePerKg: 840,
            minQty: "1 Kilogram",
          },
        ],
      },
      {
        id: "premium-blend",
        name: "Premium Blend",
        category: "Filter Coffee",
        description: "Our premium offering with 60% Arabica for those who appreciate finer coffee notes.",
        baseBlend: "60% Arabica + 40% Robusta blended with Chicory",
        image: "@/assets/products/premium-blend.png",
        variants: [
          {
            id: "premium-blend-1",
            name: "Premium Blend 1 (60% Arabica + 40% Robusta + 30% Chicory)",
            arabicaPercent: 60,
            robustaPercent: 40,
            chicoryPercent: 30,
            pricePerKg: 780,
            minQty: "1 Kilogram",
          },
          {
            id: "premium-blend-2",
            name: "Premium Blend 2 (60% Arabica + 40% Robusta + 20% Chicory)",
            arabicaPercent: 60,
            robustaPercent: 40,
            chicoryPercent: 20,
            pricePerKg: 840,
            minQty: "1 Kilogram",
          },
          {
            id: "premium-blend-3",
            name: "Premium Blend 3 (60% Arabica + 40% Robusta + 10% Chicory)",
            arabicaPercent: 60,
            robustaPercent: 40,
            chicoryPercent: 10,
            pricePerKg: 880,
            minQty: "1 Kilogram",
          },
        ],
      },
    ],
  },

  // 2. SPECIALTY BLENDS
  {
    id: "specialty-blends",
    name: "Specialty Blends",
    description: "100% Arabica coffee blended with varying chicory levels for connoisseurs",
    products: [
      {
        id: "specialty-blend",
        name: "Specialty Blend",
        category: "Specialty Coffee",
        description: "Our finest offering featuring 100% Arabica coffee. Available in three chicory variations to suit different taste preferences.",
        baseBlend: "100% Arabica blended with Chicory",
        image: "@/assets/products/specialty-blend.png",
        variants: [
          {
            id: "specialty-blend-1",
            name: "Specialty Blend 1 (70% Arabica + 30% Chicory)",
            arabicaPercent: 70,
            robustaPercent: 0,
            chicoryPercent: 30,
            pricePerKg: 860,
            minQty: "1 Kilogram",
          },
          {
            id: "specialty-blend-2",
            name: "Specialty Blend 2 (80% Arabica + 20% Chicory)",
            arabicaPercent: 80,
            robustaPercent: 0,
            chicoryPercent: 20,
            pricePerKg: 900,
            minQty: "1 Kilogram",
          },
          {
            id: "specialty-blend-3",
            name: "Specialty Blend 3 (90% Arabica + 10% Chicory)",
            arabicaPercent: 90,
            robustaPercent: 0,
            chicoryPercent: 10,
            pricePerKg: 940,
            minQty: "1 Kilogram",
          },
        ],
      },
    ],
  },

  // 3. ROYAL CAFFEINE (NO CHICORY)
  {
    id: "royal-caffeine",
    name: "Royal Caffeine",
    description: "100% Pure coffee without chicory - for the true coffee purist",
    products: [
      {
        id: "royal-caffeine",
        name: "Royal Caffeine",
        category: "Pure Coffee",
        description: "Our purest coffee range with no chicory added. Experience the authentic taste of single-origin and blended coffees in their purest form.",
        baseBlend: "100% Pure Coffee (No Chicory)",
        image: "@/assets/products/royal-caffeine.png",
        variants: [
          {
            id: "pure-arabica",
            name: "Pure Arabica (100% Arabica)",
            arabicaPercent: 100,
            robustaPercent: 0,
            chicoryPercent: 0,
            pricePerKg: 1120,
            minQty: "1 Kilogram",
          },
          {
            id: "pure-robusta",
            name: "Pure Robusta (100% Robusta)",
            arabicaPercent: 0,
            robustaPercent: 100,
            chicoryPercent: 0,
            pricePerKg: 980,
            minQty: "1 Kilogram",
          },
          {
            id: "arabica-robusta-blend",
            name: "Arabica + Robusta Blend (50% + 50%)",
            arabicaPercent: 50,
            robustaPercent: 50,
            chicoryPercent: 0,
            pricePerKg: 1000,
            minQty: "1 Kilogram",
          },
        ],
      },
    ],
  },

  // 4. INSTANT & READY PRODUCTS
  {
    id: "instant-ready",
    name: "Instant & Ready Products",
    description: "Convenient coffee products for quick preparation",
    products: [
      {
        id: "instant-decoction",
        name: "Instant Filter Coffee Decoction",
        category: "Instant Coffee",
        description: "Ready-to-use filter coffee decoction. Just add hot milk and enjoy authentic South Indian filter coffee instantly.",
        image: "",
        variants: [],
      },
    ],
  },

  // 5. OTHER PRODUCTS
  {
    id: "other-products",
    name: "Other Products",
    description: "Coffee-based products and specialty items from Coorg",
    products: [
      {
        id: "coffee-chocolate",
        name: "Homemade Coffee Chocolate",
        category: "Confectionery",
        description: "Handcrafted chocolate infused with our signature coffee flavor. A perfect blend of rich cocoa and aromatic coffee.",
        image: "@/assets/products/coffee-chocolate.jpg",
        variants: [],
      },
      {
        id: "coffee-soap",
        name: "Coffee Soap",
        category: "Personal Care",
        description: "Natural soap made with coffee extracts. Exfoliating and aromatic.",
        image: "",
        variants: [],
      },
      {
        id: "coffee-jams",
        name: "Coffee & Natural Fruit Jams",
        category: "Food Products",
        description: "Homemade jams combining coffee with natural fruits from Coorg.",
        image: "",
        variants: [
          {
            id: "coffee-jam",
            name: "Coffee Jam",
            pricePerKg: 0,
            minQty: "1 Jar",
          },
        ],
      },
      {
        id: "coffee-oasis",
        name: "Coffee Oasis",
        category: "Beverages",
        description: "Refreshing coffee-based drink for a unique experience.",
        image: "",
        variants: [],
      },
      {
        id: "tea-powder",
        name: "Tea Powder",
        category: "Tea",
        description: "Premium tea powder from the hills of Coorg.",
        image: "",
        variants: [
          {
            id: "gold-tea",
            name: "Gold Tea",
            pricePerKg: 0,
            minQty: "1 Kilogram",
          },
          {
            id: "premium-tea",
            name: "Premium Tea",
            pricePerKg: 0,
            minQty: "1 Kilogram",
          },
          {
            id: "pan-tea",
            name: "Pan Tea",
            pricePerKg: 0,
            minQty: "1 Kilogram",
          },
        ],
      },
      {
        id: "organic-turmeric",
        name: "Organic Turmeric Powder",
        category: "Spices",
        description: "Pure organic turmeric from Coorg's fertile lands.",
        image: "",
        variants: [],
      },
      {
        id: "coorg-honey",
        name: "Coorg Honey",
        category: "Natural Products",
        description: "Pure honey sourced from the forests of Coorg.",
        image: "",
        variants: [],
      },
      {
        id: "coffee-wine",
        name: "Homemade Coffee Wine",
        category: "Beverages",
        description: "Unique artisanal wine crafted from coffee. A Sharma Coffee specialty.",
        image: "",
        variants: [],
      },
      {
        id: "coffee-equipment",
        name: "Coffee Equipment",
        category: "Equipment",
        description: "Traditional South Indian coffee brewing equipment.",
        image: "",
        variants: [
          {
            id: "percolator",
            name: "Coffee Percolator",
            pricePerKg: 0,
            minQty: "1 Piece",
          },
          {
            id: "double-decker-filter",
            name: "Double Decker Filter",
            pricePerKg: 0,
            minQty: "1 Piece",
          },
        ],
      },
    ],
  },
];

// ============================================
// G. NAVIGATION & PAGES STRUCTURE
// ============================================

export const siteNavigation = {
  mainNav: [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Wholesale", href: "/wholesale" },
    { label: "Processing", href: "/processing" },
    { label: "Contact Us", href: "/contact" },
  ],
  shopCategories: [
    { label: "Coorg Classic", href: "/shop/coorg-classic" },
    { label: "Gold Blend", href: "/shop/gold-blend" },
    { label: "Premium Blend", href: "/shop/premium-blend" },
    { label: "Specialty Blend", href: "/shop/specialty-blend" },
    { label: "Royal Caffeine", href: "/shop/royal-caffeine" },
    { label: "Other Products", href: "/shop/other" },
  ],
};

// ============================================
// H. SEO METADATA
// ============================================

export const seoMetadata = {
  home: {
    title: "Sharma Coffee Works - The Taste of Coorg Since 1987",
    description: "Premium coffee roasters from Coorg, Karnataka. Experience authentic South Indian filter coffee with our Gold, Premium, Specialty, and Royal Caffeine blends.",
    keywords: ["Coorg coffee", "filter coffee", "South Indian coffee", "Sharma Coffee", "Arabica", "Robusta", "chicory coffee", "Madikeri coffee"],
  },
  about: {
    title: "About Us - Sharma Coffee Works | Generations of Coffee Roasters",
    description: "Discover the legacy of Sharma Coffee Works. From 1987, we've been crafting premium coffee from Coorg's finest plantations.",
  },
  shop: {
    title: "Shop Coffee - Sharma Coffee Works | Premium Coorg Coffee Online",
    description: "Buy premium Coorg coffee online. Gold Blend, Premium Blend, Specialty Blend, and Royal Caffeine pure coffee available.",
  },
  processing: {
    title: "Our Process - Sharma Coffee Works | From Bean to Cup",
    description: "Learn about our coffee journey - selection, roasting, granulating, blending, and packing. Traditional methods with modern precision.",
  },
  contact: {
    title: "Contact Us - Sharma Coffee Works | Madikeri, Coorg",
    description: "Visit our retail store in Madikeri or reach out for wholesale inquiries. We respond within 12 hours.",
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const getAllProducts = (): Product[] => {
  return productCategories.flatMap(category => category.products);
};

export const getProductById = (id: string): Product | undefined => {
  return getAllProducts().find(product => product.id === id);
};

export const getCategoryById = (id: string): ProductCategory | undefined => {
  return productCategories.find(category => category.id === id);
};

export const getFilterCoffeeProducts = (): Product[] => {
  const filterCategories = ["filter-coffee-blends", "specialty-blends", "royal-caffeine"];
  return productCategories
    .filter(cat => filterCategories.includes(cat.id))
    .flatMap(cat => cat.products);
};
