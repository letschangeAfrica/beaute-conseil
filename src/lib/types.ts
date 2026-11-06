export type SkinType = "grasse" | "seche" | "mixte" | "normale";
export type SkinTone = "tres-clair" | "clair" | "moyen" | "mat" | "fonce" | "tres-fonce";
export type Undertone = "chaud" | "froid" | "neutre" | "olive" | "inconnu";

export type Concern = "acne" | "taches" | "rides" | "rougeurs" | "pores" | "teint-terne";
export type Avoid =
  | "parfum"
  | "parabenes"
  | "silicones"
  | "sulfates"
  | "alcool"
  | "huiles-essentielles"
  | "nano";
export type Pref = "vegan" | "bio";

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

export interface ShadeAnalysis {
  skinTone: SkinTone;
  undertone: Undertone;
  confidence: "faible" | "moyenne" | "elevee";
  explanation: string;
  foundationTips: string;
  colorsToTry: string[];
  colorsToAvoid: string[];
  photoQualityNote: string;
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
