import {
  COMEDOGENIC,
  CONTROVERSIAL,
  ESSENTIAL_OILS,
  EU_ALLERGENS,
  FRAGRANCE,
  GOOD_FOR,
  NANO,
  PARABENS,
  SILICONES,
  SPF_FILTERS,
  SULFATES,
  findAny,
  hasDryingAlcohol,
  matchesAllergy,
  parseIngredients,
} from "./ingredients";
import type { Avoid, PricePoint, Product, Profile, Reason, ScoredProduct, Verdict } from "./types";

const CONCERN_LABEL: Record<string, string> = {
  acne: "l'acné",
  taches: "les taches",
  rides: "les rides",
  rougeurs: "les rougeurs",
  pores: "les pores",
  "teint-terne": "le teint terne",
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function verdictFor(score: number, hasData: boolean): Verdict {
  if (!hasData) return "inconnu";
  if (score >= 75) return "excellent";
  if (score >= 60) return "bon";
  if (score >= 40) return "moyen";
  return "eviter";
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  excellent: "Excellent pour vous",
  bon: "Bon choix",
  moyen: "Moyen",
  eviter: "À éviter",
  inconnu: "Infos insuffisantes",
};

/* ---------- Rule context ------------------------------------------------ */

/**
 * Shared state for the scoring rules. Rules never touch `score` or `reasons`
 * directly: they call plus / minus / info, which also record the reason text.
 */
interface Ctx {
  product: Product;
  profile: Profile | null;
  price?: PricePoint;
  ings: string[];
  /** Lower-cased product name, for finish keywords ("mat", "glow"…). */
  name: string;
  avoid: Set<Avoid>;
  sensitive: boolean;
  controversial: string[];
  plus: (pts: number, text: string) => void;
  minus: (pts: number, text: string) => void;
  info: (text: string) => void;
}
type Rule = (c: Ctx) => void;

/* ---------- Ingredient rules (only when the INCI list is known) --------- */

const controversialRule: Rule = (c) => {
  if (c.controversial.length) c.minus(6 + 3 * c.controversial.length, `Ingrédients controversés : ${c.controversial.join(", ")}.`);
};

const fragranceRule: Rule = (c) => {
  if (!findAny(c.ings, FRAGRANCE).length) return c.plus(c.sensitive ? 8 : 3, "Sans parfum.");
  if (c.avoid.has("parfum") || c.sensitive) c.minus(12, "Contient du parfum (déconseillé pour vous).");
  else c.info("Contient du parfum.");
};

const allergenRule: Rule = (c) => {
  const allergens = findAny(c.ings, EU_ALLERGENS);
  if (allergens.length >= 3 && c.sensitive) c.minus(8, `${allergens.length} allergènes parfumés (${allergens.slice(0, 3).join(", ")}…).`);
};

const has = (list: readonly string[]) => (ings: string[]) => findAny(ings, list).length > 0;
const AVOID_CHECKS: [Avoid, (ings: string[]) => boolean, string][] = [
  ["parabenes", has(PARABENS), "Contient des parabènes."],
  ["silicones", has(SILICONES), "Contient des silicones."],
  ["sulfates", has(SULFATES), "Contient des sulfates."],
  ["alcool", hasDryingAlcohol, "Contient de l'alcool asséchant."],
  ["huiles-essentielles", has(ESSENTIAL_OILS), "Contient des huiles essentielles."],
  ["nano", has(NANO), "Contient des nanoparticules."],
];
const avoidRule: Rule = (c) => {
  for (const [key, present, text] of AVOID_CHECKS) {
    if (c.avoid.has(key) && present(c.ings)) c.minus(10, `${text} (vous préférez éviter)`);
  }
};

const oilySkinRule: Rule = (c) => {
  const skin = c.profile?.skinType;
  const acneProne = c.profile?.concerns.includes("acne") ?? false;
  if (skin !== "grasse" && skin !== "mixte" && !acneProne) return;
  const como = findAny(c.ings, COMEDOGENIC);
  if (como.length) c.minus(8 + 3 * Math.min(como.length, 3), `Peut boucher les pores (${como.slice(0, 3).join(", ")}).`);
  const good = findAny(c.ings, GOOD_FOR.grasse);
  if (good.length) c.plus(6, `Bon pour peau grasse/mixte (${good.slice(0, 2).join(", ")}).`);
  if (/\bmat|matte|oil.?free|sans huile/.test(c.name)) c.plus(5, "Fini mat, idéal si vous brillez.");
};

const drySkinRule: Rule = (c) => {
  if (c.profile?.skinType !== "seche") return;
  const good = findAny(c.ings, GOOD_FOR.seche);
  if (good.length) c.plus(Math.min(12, 4 * good.length), `Hydratant (${good.slice(0, 3).join(", ")}).`);
  if (hasDryingAlcohol(c.ings)) c.minus(8, "L'alcool peut assécher votre peau.");
  if (/hydrat|glow|lumi|radiant|satin/.test(c.name)) c.plus(4, "Fini lumineux/hydratant, adapté peau sèche.");
  if (/\bmat|matte|poudre|powder/.test(c.name)) c.minus(4, "Fini mat/poudré : peut marquer les peaux sèches.");
};

const sensitiveSkinRule: Rule = (c) => {
  if (!c.sensitive) return;
  const good = findAny(c.ings, GOOD_FOR.sensible);
  if (good.length) c.plus(6, `Apaisant (${good.slice(0, 2).join(", ")}).`);
  if (hasDryingAlcohol(c.ings) && !c.avoid.has("alcool")) c.minus(6, "Alcool : peut irriter une peau sensible.");
};

const concernsRule: Rule = (c) => {
  const concerns = c.profile?.concerns ?? [];
  for (const concern of concerns) {
    const good = findAny(c.ings, GOOD_FOR[concern]);
    if (good.length) c.plus(5, `Actifs pour ${CONCERN_LABEL[concern]} (${good.slice(0, 2).join(", ")}).`);
  }
  const hasSpf = findAny(c.ings, SPF_FILTERS).length > 0 || /spf/.test(c.name);
  if (concerns.includes("taches") && hasSpf) c.plus(4, "Contient une protection solaire, utile contre les taches.");
};

const shortFormulaRule: Rule = (c) => {
  if (c.ings.length <= 15 && !c.controversial.length) c.plus(3, "Formule courte.");
};

/** Order matters: it is the order reasons are shown in. */
const INGREDIENT_RULES: Rule[] = [
  controversialRule,
  fragranceRule,
  allergenRule,
  avoidRule,
  oilySkinRule,
  drySkinRule,
  sensitiveSkinRule,
  concernsRule,
  shortFormulaRule,
];

/* ---------- Rules that apply even without an ingredient list ------------ */

const labelsRule: Rule = (c) => {
  const labels = c.product.labels.join(" ");
  if (c.profile?.prefs.includes("vegan") && /vegan/.test(labels)) c.plus(6, "Vegan, comme vous le souhaitez.");
  if (c.profile?.prefs.includes("bio") && /organic|ecocert|cosmos|bio/.test(labels)) c.plus(6, "Certifié bio.");
};

const popularityRule: Rule = (c) => {
  if (c.product.scans >= 50) c.plus(3, "Produit très consulté par les utilisateurs.");
};

const budgetRule: Rule = (c) => {
  const budget = c.profile?.budget;
  if (!c.price || !budget) return;
  const p = c.price.price;
  if (p <= budget) c.plus(5, `Dans votre budget (${p.toFixed(2)} €).`);
  else if (p > budget * 1.3) c.minus(10, `Au-dessus de votre budget (${p.toFixed(2)} €).`);
  else c.minus(4, `Un peu au-dessus de votre budget (${p.toFixed(2)} €).`);
};

const GENERAL_RULES: Rule[] = [labelsRule, popularityRule, budgetRule];

/* ---------- Entry point -------------------------------------------------- */

/**
 * Which of her allergies appear in the ingredient list (rule in allergyVariants: accents ignored,
 * French final "e" dropped). Each hit is reported as she typed it.
 */
function findAllergies(ings: string[], profile: Profile | null): string[] | undefined {
  const hits = new Set<string>();
  for (const raw of profile?.allergies ?? []) {
    if (ings.some((ing) => matchesAllergy(ing, raw))) hits.add(raw.toLowerCase().trim());
  }
  return hits.size ? [...hits] : undefined;
}

/**
 * Score a product for a given profile. Returns a 0–100 score plus
 * plain-language reasons (in French) explaining the score.
 *
 * To add a criterion: write a Rule above and insert it in INGREDIENT_RULES
 * or GENERAL_RULES at the position its reason should appear.
 */
export function scoreProduct(product: Product, profile: Profile | null, price?: PricePoint): ScoredProduct {
  const ings = parseIngredients(product.ingredientsText);
  const hasData = ings.length >= 3;
  const reasons: Reason[] = [];
  let score = hasData ? 62 : 50;

  const ctx: Ctx = {
    product,
    profile,
    price,
    ings,
    name: product.name.toLowerCase(),
    avoid: new Set(profile?.avoid ?? []),
    sensitive: profile?.sensitive ?? false,
    controversial: hasData ? findAny(ings, CONTROVERSIAL) : [],
    plus: (pts, text) => {
      score += pts;
      reasons.push({ kind: "plus", text });
    },
    minus: (pts, text) => {
      score -= pts;
      reasons.push({ kind: "minus", text });
    },
    info: (text) => {
      reasons.push({ kind: "info", text });
    },
  };

  if (!hasData) ctx.info("Liste d'ingrédients non renseignée : analyse limitée.");

  // Allergies are a hard stop: big penalty now, score capped at 15 below.
  // Checked on any ingredient list, even one too short for the other rules (e.g. pure lanolin).
  const allergyHit = findAllergies(ings, profile);
  if (allergyHit) ctx.minus(60, `Contient ${allergyHit.join(", ")} : vous y êtes allergique.`);

  if (hasData) for (const rule of INGREDIENT_RULES) rule(ctx);
  for (const rule of GENERAL_RULES) rule(ctx);

  const final = allergyHit ? Math.min(clamp(score), 15) : clamp(score);
  return {
    ...product,
    score: final,
    verdict: allergyHit ? "eviter" : verdictFor(final, hasData),
    reasons,
    allergyHit,
    bestPrice: price,
  };
}

const TONE_LABEL: Record<string, string> = {
  "tres-clair": "très claire",
  clair: "claire",
  moyen: "medium",
  mat: "mate",
  fonce: "foncée",
  "tres-fonce": "très foncée",
};
const UNDERTONE_LABEL: Record<string, string> = {
  chaud: "chaud (teintes « W », « dorées », « golden »)",
  froid: "froid (teintes « C », « rosées », « pink »)",
  neutre: "neutre (teintes « N »)",
  olive: "olive (teintes « O » ou neutres-dorées)",
  inconnu: "à déterminer",
};

/** Short shade advice for complexion products. */
export function shadeAdvice(profile: Profile | null): string | null {
  if (!profile) return null;
  return `Pour une carnation ${TONE_LABEL[profile.skinTone]} au sous-ton ${UNDERTONE_LABEL[profile.undertone]}. Testez toujours sur la mâchoire, à la lumière du jour.`;
}

export function isComplexionProduct(p: Product): boolean {
  const cats = p.categories.join(" ");
  return /foundation|concealer|bb-cream|cc-cream|face-powder|tinted/.test(cats) || /fond de teint|correcteur|anticernes|bb cream|cc cream/i.test(p.name);
}
