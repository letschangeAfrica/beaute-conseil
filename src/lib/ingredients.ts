/**
 * Ingredient knowledge base used by the scoring engine.
 * Matching is done on the lower-cased INCI list (substring match),
 * so entries should be lower-case and specific enough to avoid false hits.
 */

export const FRAGRANCE = ["parfum", "fragrance", "aroma"];

/** The 26 fragrance allergens that EU law requires on the label (Reg. 1223/2009, Annex III). */
export const EU_ALLERGENS = [
  "amyl cinnamal",
  "amylcinnamyl alcohol",
  "anise alcohol",
  "benzyl alcohol",
  "benzyl benzoate",
  "benzyl cinnamate",
  "benzyl salicylate",
  "butylphenyl methylpropional",
  "cinnamal",
  "cinnamyl alcohol",
  "citral",
  "citronellol",
  "coumarin",
  "eugenol",
  "evernia furfuracea",
  "evernia prunastri",
  "farnesol",
  "geraniol",
  "hexyl cinnamal",
  "hydroxycitronellal",
  "isoeugenol",
  "limonene",
  "linalool",
  "methyl 2-octynoate",
  "alpha-isomethyl ionone",
];

export const PARABENS = ["paraben"];
export const SILICONES = ["dimethicone", "cyclopentasiloxane", "cyclohexasiloxane", "siloxane", "methicone"];
export const SULFATES = ["sodium lauryl sulfate", "sodium laureth sulfate", "ammonium lauryl sulfate", "ammonium laureth sulfate"];
export const ESSENTIAL_OILS = ["leaf oil", "peel oil", "flower oil", "herb oil", "essential oil", "bark oil", "seed oil citrus"];
export const NANO = ["[nano]", "(nano)"];

/** Ingredients flagged as controversial (endocrine disruption suspicion, strong allergens, formaldehyde releasers). */
export const CONTROVERSIAL = [
  "methylisothiazolinone",
  "methylchloroisothiazolinone",
  "triclosan",
  "butylparaben",
  "propylparaben",
  "bht",
  "bha",
  "butylated hydroxy",
  "formaldehyde",
  "dmdm hydantoin",
  "quaternium-15",
  "imidazolidinyl urea",
  "diazolidinyl urea",
];

/** Known pore-clogging ingredients: bad for oily or acne-prone skin. */
export const COMEDOGENIC = [
  "isopropyl myristate",
  "isopropyl palmitate",
  "isopropyl isostearate",
  "cocos nucifera",
  "coconut oil",
  "theobroma cacao",
  "cocoa butter",
  "lanolin",
  "algae extract",
  "laminaria",
  "carrageenan",
  "myristyl myristate",
  "ethylhexyl palmitate",
  "octyl palmitate",
  "triticum vulgare germ",
  "wheat germ",
  "laureth-4",
  "isocetyl stearate",
  "butyl stearate",
];

export const GOOD_FOR = {
  grasse: ["salicylic acid", "niacinamide", "zinc", "kaolin", "silica", "clay"],
  seche: ["sodium hyaluronate", "hyaluronic acid", "glycerin", "squalane", "ceramide", "butyrospermum", "shea", "panthenol"],
  sensible: ["allantoin", "bisabolol", "panthenol", "centella", "madecassoside", "avena sativa", "aloe barbadensis"],
  rides: ["retinol", "retinyl", "peptide", "sodium hyaluronate", "niacinamide", "ascorbic", "tocopherol"],
  taches: ["niacinamide", "ascorbic", "azelaic", "arbutin", "tranexamic", "glycyrrhiza"],
  rougeurs: ["centella", "niacinamide", "azelaic", "allantoin", "bisabolol"],
  acne: ["salicylic acid", "niacinamide", "zinc", "azelaic"],
  pores: ["niacinamide", "salicylic acid", "kaolin", "clay"],
  "teint-terne": ["ascorbic", "niacinamide", "mica", "glycolic", "lactic acid"],
} as const;

export const SPF_FILTERS = ["titanium dioxide", "zinc oxide", "ethylhexyl methoxycinnamate", "octocrylene", "bis-ethylhexyloxyphenol", "avobenzone", "butyl methoxydibenzoylmethane"];

/** Split an INCI string into normalised ingredient tokens. */
export function parseIngredients(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\(f\.i\.l\.[^)]*\)/g, "")
    .replace(/[*.]/g, " ")
    .split(/[,;]|\s\/\s|\+\/-|may contain|peut contenir/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Return which of `needles` appear in the ingredient list. */
export function findAny(ingredients: string[], needles: readonly string[]): string[] {
  const hits = new Set<string>();
  for (const needle of needles) {
    if (ingredients.some((ing) => ing.includes(needle))) hits.add(needle);
  }
  return [...hits];
}

/** Drying alcohol (not fatty alcohols like cetyl/cetearyl alcohol). */
export function hasDryingAlcohol(ingredients: string[]): boolean {
  return ingredients.some(
    (ing) => ing === "alcohol" || ing.startsWith("alcohol denat") || ing.startsWith("sd alcohol") || ing === "ethanol",
  );
}

const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Spellings of one allergy as she typed it, to search for in INCI names. Errs on the side of warning:
 * accents are ignored and a French final "e" is dropped, so « lanoline » matches "lanolin" and
 * « glycérine » matches "glycerin". Empty input gives no variant.
 */
export function allergyVariants(allergy: string): string[] {
  const a = stripAccents(allergy.toLowerCase().trim());
  if (!a) return [];
  return a.length > 4 && a.endsWith("e") ? [a, a.slice(0, -1)] : [a];
}

/** True when this ingredient matches this allergy (same rule as the product score). */
export function matchesAllergy(ingredient: string, allergy: string): boolean {
  const ing = stripAccents(ingredient.toLowerCase());
  return allergyVariants(allergy).some((v) => ing.includes(v));
}
