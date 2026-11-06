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

/**
 * Score a product for a given profile. Returns a 0–100 score plus
 * plain-language reasons (in French) explaining the score.
 */
export function scoreProduct(product: Product, profile: Profile | null, price?: PricePoint): ScoredProduct {
  const reasons: Reason[] = [];
  const ings = parseIngredients(product.ingredientsText);
  const hasData = ings.length >= 3;
  const name = product.name.toLowerCase();
  let score = 62;

  const plus = (pts: number, text: string) => {
    score += pts;
    reasons.push({ kind: "plus", text });
  };
  const minus = (pts: number, text: string) => {
    score -= pts;
    reasons.push({ kind: "minus", text });
  };

  if (!hasData) {
    reasons.push({ kind: "info", text: "Liste d'ingrédients non renseignée : analyse limitée." });
    score = 50;
  }

  // --- Allergies (hard stop) --------------------------------------------
  let allergyHit: string[] | undefined;
  if (profile && hasData && profile.allergies.length) {
    const needles = profile.allergies.map((a) => a.toLowerCase().trim()).filter(Boolean);
    const hits = findAny(ings, needles);
    if (hits.length) {
      allergyHit = hits;
      minus(60, `Contient ${hits.join(", ")} : vous y êtes allergique.`);
    }
  }

  if (hasData) {
    // --- Generally controversial ingredients ----------------------------
    const controversial = findAny(ings, CONTROVERSIAL);
    if (controversial.length) minus(6 + 3 * controversial.length, `Ingrédients controversés : ${controversial.join(", ")}.`);

    const fragrance = findAny(ings, FRAGRANCE);
    const allergens = findAny(ings, EU_ALLERGENS);
    const avoid = new Set(profile?.avoid ?? []);
    const sensitive = profile?.sensitive ?? false;

    if (fragrance.length) {
      if (avoid.has("parfum") || sensitive) minus(12, "Contient du parfum (déconseillé pour vous).");
      else reasons.push({ kind: "info", text: "Contient du parfum." });
    } else {
      plus(sensitive ? 8 : 3, "Sans parfum.");
    }
    if (allergens.length >= 3 && sensitive) minus(8, `${allergens.length} allergènes parfumés (${allergens.slice(0, 3).join(", ")}…).`);

    const checks: [Avoid, boolean, string][] = [
      ["parabenes", findAny(ings, PARABENS).length > 0, "Contient des parabènes."],
      ["silicones", findAny(ings, SILICONES).length > 0, "Contient des silicones."],
      ["sulfates", findAny(ings, SULFATES).length > 0, "Contient des sulfates."],
      ["alcool", hasDryingAlcohol(ings), "Contient de l'alcool asséchant."],
      ["huiles-essentielles", findAny(ings, ESSENTIAL_OILS).length > 0, "Contient des huiles essentielles."],
      ["nano", findAny(ings, NANO).length > 0, "Contient des nanoparticules."],
    ];
    for (const [key, present, text] of checks) {
      if (present && avoid.has(key)) minus(10, `${text} (vous préférez éviter)`);
    }

    // --- Skin type fit --------------------------------------------------
    const skin = profile?.skinType;
    const acneProne = profile?.concerns.includes("acne") ?? false;
    if (skin === "grasse" || skin === "mixte" || acneProne) {
      const como = findAny(ings, COMEDOGENIC);
      if (como.length) minus(8 + 3 * Math.min(como.length, 3), `Peut boucher les pores (${como.slice(0, 3).join(", ")}).`);
      const good = findAny(ings, GOOD_FOR.grasse);
      if (good.length) plus(6, `Bon pour peau grasse/mixte (${good.slice(0, 2).join(", ")}).`);
      if (/\bmat|matte|oil.?free|sans huile/.test(name)) plus(5, "Fini mat, idéal si vous brillez.");
    }
    if (skin === "seche") {
      const good = findAny(ings, GOOD_FOR.seche);
      if (good.length) plus(Math.min(12, 4 * good.length), `Hydratant (${good.slice(0, 3).join(", ")}).`);
      if (hasDryingAlcohol(ings)) minus(8, "L'alcool peut assécher votre peau.");
      if (/hydrat|glow|lumi|radiant|satin/.test(name)) plus(4, "Fini lumineux/hydratant, adapté peau sèche.");
      if (/\bmat|matte|poudre|powder/.test(name)) minus(4, "Fini mat/poudré : peut marquer les peaux sèches.");
    }
    if (sensitive) {
      const good = findAny(ings, GOOD_FOR.sensible);
      if (good.length) plus(6, `Apaisant (${good.slice(0, 2).join(", ")}).`);
      if (hasDryingAlcohol(ings) && !avoid.has("alcool")) minus(6, "Alcool : peut irriter une peau sensible.");
    }

    // --- Concerns ---------------------------------------------------------
    for (const concern of profile?.concerns ?? []) {
      const good = findAny(ings, GOOD_FOR[concern]);
      if (good.length) plus(5, `Actifs pour ${CONCERN_LABEL[concern]} (${good.slice(0, 2).join(", ")}).`);
    }
    if (profile?.concerns.includes("taches") && (findAny(ings, SPF_FILTERS).length || /spf/.test(name))) {
      plus(4, "Contient une protection solaire, utile contre les taches.");
    }

    // --- Short, clean formulas get a small bonus -------------------------
    if (ings.length <= 15 && !controversial.length) plus(3, "Formule courte.");
  }

  // --- Preferences (labels) ----------------------------------------------
  const labels = product.labels.join(" ");
  if (profile?.prefs.includes("vegan")) {
    if (/vegan/.test(labels)) plus(6, "Vegan, comme vous le souhaitez.");
  }
  if (profile?.prefs.includes("bio")) {
    if (/organic|ecocert|cosmos|bio/.test(labels)) plus(6, "Certifié bio.");
  }

  // --- Popularity ----------------------------------------------------------
  if (product.scans >= 50) plus(3, "Produit très consulté par les utilisateurs.");

  // --- Price vs budget -----------------------------------------------------
  if (price && profile?.budget) {
    if (price.price <= profile.budget) plus(5, `Dans votre budget (${price.price.toFixed(2)} €).`);
    else if (price.price > profile.budget * 1.3) minus(10, `Au-dessus de votre budget (${price.price.toFixed(2)} €).`);
    else minus(4, `Un peu au-dessus de votre budget (${price.price.toFixed(2)} €).`);
  }

  let final = clamp(score);
  if (allergyHit) final = Math.min(final, 15);

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
