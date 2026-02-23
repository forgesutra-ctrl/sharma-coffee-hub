/**
 * Taste Profile Quiz - Questions and matching logic for coffee recommendations
 */

export interface QuizQuestion {
  id: string;
  question: string;
  options: { value: string; label: string; keywords?: string[] }[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "roast",
    question: "What roast level do you prefer?",
    options: [
      { value: "light", label: "Light — Bright, delicate, fruity" },
      { value: "medium", label: "Medium — Balanced, smooth, versatile" },
      { value: "dark", label: "Dark — Bold, rich, intense" },
      { value: "any", label: "Not sure — Surprise me!" },
    ],
  },
  {
    id: "flavor",
    question: "Which flavor profile appeals to you?",
    options: [
      { value: "bold", label: "Bold & Strong", keywords: ["bold", "strong", "intense", "rich"] },
      { value: "nutty", label: "Nutty & Chocolate", keywords: ["nutty", "chocolate", "smooth", "traditional"] },
      { value: "fruity", label: "Fruity & Floral", keywords: ["fruity", "floral", "aromatic", "delicate"] },
      { value: "balanced", label: "Smooth & Balanced", keywords: ["smooth", "balanced", "versatile", "refined"] },
      { value: "traditional", label: "Traditional & Classic", keywords: ["traditional", "classic", "authentic", "pure"] },
    ],
  },
  {
    id: "body",
    question: "How do you like your coffee's body?",
    options: [
      { value: "light", label: "Light — Clean, tea-like" },
      { value: "medium", label: "Medium — Well-rounded" },
      { value: "full", label: "Full — Thick, syrupy" },
    ],
  },
  {
    id: "brewing",
    question: "How do you usually brew?",
    options: [
      { value: "filter", label: "Filter / Pour-over" },
      { value: "espresso", label: "Espresso / Moka" },
      { value: "instant", label: "Instant / Quick brew" },
      { value: "milk", label: "With milk (latte, cappuccino)" },
    ],
  },
];

export interface QuizAnswers {
  roast: string;
  flavor: string;
  body: string;
  brewing: string;
}

export interface FlatProduct {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  category: string;
  categorySlug: string | null;
  description: string;
  flavorNotes: string[];
  inStock: boolean;
  roastLevel: string | null;
  intensity: number | null;
  isFeatured: boolean;
}

const ROAST_MAP: Record<string, string[]> = {
  light: ["light", "Light"],
  medium: ["medium", "Medium"],
  dark: ["dark", "Dark"],
  any: ["light", "Light", "medium", "Medium", "dark", "Dark"],
};

/**
 * Score a product against quiz answers (higher = better match)
 */
export function scoreProduct(product: FlatProduct, answers: QuizAnswers): number {
  let score = 0;

  // Roast match (0–30 points)
  const roastOptions = ROAST_MAP[answers.roast] || ROAST_MAP.any;
  const productRoast = (product.roastLevel || "").toLowerCase();
  if (roastOptions.some((r) => r.toLowerCase() === productRoast)) {
    score += answers.roast === "any" ? 15 : 30;
  } else if (answers.roast === "any") {
    score += 10; // Any still gets some points for all products
  }

  // Flavor notes overlap (0–40 points)
  const flavorOption = QUIZ_QUESTIONS.find((q) => q.id === "flavor")?.options.find(
    (o) => o.value === answers.flavor
  );
  const keywords = (flavorOption?.keywords || []).map((k) => k.toLowerCase());
  const productNotes = (product.flavorNotes || []).map((n) => n.toLowerCase());
  const overlap = keywords.filter((k) =>
    productNotes.some((n) => n.includes(k) || k.includes(n))
  ).length;
  if (overlap > 0) {
    score += Math.min(40, overlap * 15);
  } else {
    // Fallback: check if any product note matches common terms
    const fallbacks = ["smooth", "balanced", "rich", "bold", "aromatic"];
    if (productNotes.some((n) => fallbacks.some((f) => n.includes(f)))) {
      score += 10;
    }
  }

  // Body / intensity (0–20 points)
  const intensity = product.intensity ?? 3;
  const bodyMap: Record<string, number[]> = {
    light: [1, 2],
    medium: [2, 3, 4],
    full: [4, 5],
  };
  const preferredIntensity = bodyMap[answers.body] || [2, 3, 4];
  if (preferredIntensity.includes(intensity)) {
    score += 20;
  } else if (Math.abs(intensity - (preferredIntensity[0] + preferredIntensity[1]) / 2) <= 1) {
    score += 10;
  }

  // Brewing compatibility (0–10 points) — all products work for most methods
  score += 10;

  // Featured bonus
  if (product.isFeatured) score += 5;

  return score;
}

/**
 * Get top product recommendations based on quiz answers
 */
export function getQuizRecommendations(
  products: FlatProduct[],
  answers: QuizAnswers,
  limit = 8
): FlatProduct[] {
  const scored = products
    .filter((p) => p.inStock)
    .map((p) => ({ product: p, score: scoreProduct(p, answers) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ product }) => product);
}

const STORAGE_KEY = "taste_profile_quiz_results";

export function saveQuizResults(answers: QuizAnswers, productIds: string[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ answers, productIds, timestamp: Date.now() })
    );
  } catch {
    // Ignore
  }
}

export function getStoredQuizResults(): {
  answers: QuizAnswers;
  productIds: string[];
  timestamp: number;
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.answers) return null;
    return parsed;
  } catch {
    return null;
  }
}
