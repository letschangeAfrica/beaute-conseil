/*
 * Single source of truth for profile enums. The TS types below and the zod
 * schemas in ./schemas.ts are both derived from these arrays — add a value
 * here and it is accepted everywhere.
 */
export const SKIN_TYPE_VALUES = ["grasse", "seche", "mixte", "normale"] as const;
export const SKIN_TONE_VALUES = ["tres-clair", "clair", "moyen", "mat", "fonce", "tres-fonce"] as const;
export const UNDERTONE_VALUES = ["chaud", "froid", "neutre", "olive", "inconnu"] as const;
export const CONCERN_VALUES = ["acne", "taches", "rides", "rougeurs", "pores", "teint-terne"] as const;
export const AVOID_VALUES = ["parfum", "parabenes", "silicones", "sulfates", "alcool", "huiles-essentielles", "nano"] as const;
export const PREF_VALUES = ["vegan", "bio"] as const;
export const CONFIDENCE_VALUES = ["faible", "moyenne", "elevee"] as const;

export type SkinType = (typeof SKIN_TYPE_VALUES)[number];
export type SkinTone = (typeof SKIN_TONE_VALUES)[number];
export type Undertone = (typeof UNDERTONE_VALUES)[number];
export type Concern = (typeof CONCERN_VALUES)[number];
export type Avoid = (typeof AVOID_VALUES)[number];
export type Pref = (typeof PREF_VALUES)[number];
export type Confidence = (typeof CONFIDENCE_VALUES)[number];

/** Result of the selfie analysis — derived from ShadeSchema (type-only import, no runtime cycle). */
export type ShadeAnalysis = import("./schemas").ShadeAnalysis;

export interface Profile {
  name?: string;
  skinType: SkinType;
  sensitive: boolean;
  skinTone: SkinTone;
  undertone: Undertone;
  concerns: Concern[];
  avoid: Avoid[];
  prefs: Pref[];
  /** Free-text ingredient names she reacts to, e.g. "linalool", "lanolin". */
  allergies: string[];
  /** Max budget per product, in euros. */
  budget: number;
  city?: string;
  /** Advice produced by the selfie analysis. */
  shadeAdvice?: ShadeAnalysis;
}


export interface Product {
  code: string;
  name: string;
  brand: string;
  image?: string;
  ingredientsText: string;
  categories: string[];
  labels: string[];
  quantity?: string;
  scans: number;
  /** Months the product keeps once opened (the open-jar "12M" symbol), when known. */
  pao?: number;
}

export interface PricePoint {
  price: number;
  currency: string;
  date: string;
  store: string;
  city?: string;
  source: "open-prices" | "web";
  url?: string;
}

export interface Reason {
  kind: "plus" | "minus" | "info";
  text: string;
}

export type Verdict = "excellent" | "bon" | "moyen" | "eviter" | "inconnu";

export interface ScoredProduct extends Product {
  score: number;
  verdict: Verdict;
  reasons: Reason[];
  allergyHit?: string[];
  bestPrice?: PricePoint;
}

/** NDJSON events streamed by /api/chat to the advisor page, one JSON object per line. */
export type ChatEvent =
  | { type: "text" | "status" | "error"; text: string }
  | { type: "products"; items: Pick<ScoredProduct, "code" | "name" | "brand" | "image" | "score" | "verdict">[] };
