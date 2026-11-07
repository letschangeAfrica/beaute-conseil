/**
 * Plain-French explanations of ingredients, for the product page and the comparison.
 * Isomorphic and static: a small dictionary of common INCI names plus the same lists the
 * score uses (ingredients.ts), so an explanation never contradicts the score. No AI involved.
 */
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
  hasDryingAlcohol,
  matchesAllergy,
} from "./ingredients";
import type { Avoid, Profile } from "./types";

/** What an ingredient is for, in one simple sentence. Matched as a substring, longest key first. */
const ROLES: Record<string, string> = {
  aqua: "Eau : la base de la formule.",
  water: "Eau : la base de la formule.",
  glycerin: "Hydratant : retient l'eau dans la peau.",
  "butylene glycol": "Solvant hydratant, aide la texture.",
  propanediol: "Solvant hydratant d'origine végétale ou synthétique.",
  "sodium hyaluronate": "Acide hyaluronique : retient l'eau, repulpe.",
  "hyaluronic acid": "Acide hyaluronique : retient l'eau, repulpe.",
  niacinamide: "Vitamine B3 : unifie le teint et régule le sébum.",
  "salicylic acid": "Exfoliant (BHA) : désincruste les pores.",
  "glycolic acid": "Exfoliant (AHA) : donne de l'éclat.",
  "ascorbic acid": "Vitamine C : antioxydant, donne de l'éclat.",
  retinol: "Vitamine A : anti-âge, plutôt à utiliser le soir.",
  tocopherol: "Vitamine E : antioxydant, protège la formule.",
  panthenol: "Provitamine B5 : apaise et hydrate.",
  allantoin: "Apaisant.",
  ceramide: "Céramide : renforce la barrière de la peau.",
  squalane: "Huile légère et non grasse, hydratante.",
  "butyrospermum parkii": "Beurre de karité : nourrissant.",
  "caprylic/capric triglyceride": "Huile émolliente légère (dérivée de coco).",
  "paraffinum liquidum": "Huile minérale : émolliente et protectrice.",
  "mineral oil": "Huile minérale : émolliente et protectrice.",
  petrolatum: "Vaseline : protège et nourrit.",
  lanolin: "Lanoline (graisse de laine) : très nourrissante.",
  "cera alba": "Cire d'abeille : donne de la tenue.",
  beeswax: "Cire d'abeille : donne de la tenue.",
  "cetearyl alcohol": "Alcool gras : texture onctueuse, non asséchant.",
  "cetyl alcohol": "Alcool gras : texture onctueuse, non asséchant.",
  "alcohol denat": "Alcool : sèche vite, peut assécher la peau.",
  dimethicone: "Silicone : rend la texture douce et glissante.",
  talc: "Poudre minérale : absorbe et matifie.",
  mica: "Minéral nacré : donne de l'éclat.",
  silica: "Silice : absorbe le sébum, fini mat.",
  kaolin: "Argile : absorbe le sébum.",
  "titanium dioxide": "Pigment blanc et filtre UV minéral.",
  "zinc oxide": "Filtre UV minéral, apaisant.",
  "ci 77491": "Pigment (oxyde de fer rouge).",
  "ci 77492": "Pigment (oxyde de fer jaune).",
  "ci 77499": "Pigment (oxyde de fer noir).",
  "ci 77891": "Pigment blanc (dioxyde de titane).",
  "iron oxides": "Pigments (oxydes de fer).",
  "bismuth oxychloride": "Pigment nacré, peut gêner les peaux sensibles.",
  "synthetic fluorphlogopite": "Minéral nacré synthétique : éclat.",
  isododecane: "Solvant volatil : aide la tenue (mascara, rouge à lèvres).",
  trimethylsiloxysilicate: "Résine : longue tenue.",
  "nylon-12": "Poudre fine : toucher doux, fini flouté.",
  polyethylene: "Cire synthétique : texture et tenue.",
  "xanthan gum": "Épaississant naturel.",
  carbomer: "Gélifiant.",
  "disodium edta": "Stabilisant de la formule.",
  "citric acid": "Ajuste l'acidité (pH).",
  "sodium hydroxide": "Ajuste le pH (neutralisé dans le produit fini).",
  phenoxyethanol: "Conservateur.",
  ethylhexylglycerin: "Conservateur doux et hydratant.",
  "sodium benzoate": "Conservateur.",
  "potassium sorbate": "Conservateur.",
  "cocamidopropyl betaine": "Tensioactif doux : aide à nettoyer.",
  "sodium lauryl sulfate": "Tensioactif moussant, peut dessécher.",
  "sodium laureth sulfate": "Tensioactif moussant.",
  parfum: "Parfum : mélange de substances odorantes.",
  fragrance: "Parfum : mélange de substances odorantes.",
};
const ROLE_KEYS = Object.keys(ROLES).sort((a, b) => b.length - a.length);

export type FactKind = "allergy" | "avoid" | "warn" | "good" | "info";
export interface IngredientFact {
  kind: FactKind;
  text: string;
}
export interface IngredientExplanation {
  /** As printed (normalised to lower case by the parser). */
  name: string;
  role?: string;
  facts: IngredientFact[];
}

const has = (ing: string, list: readonly string[]) => list.some((n) => ing.includes(n));

/** Ingredient families, with the "avoid" preference they belong to (if any). */
const FAMILIES: { list: readonly string[]; label: string; avoid?: Avoid }[] = [
  { list: FRAGRANCE, label: "Parfum.", avoid: "parfum" },
  { list: PARABENS, label: "Parabène (conservateur).", avoid: "parabenes" },
  { list: SILICONES, label: "Silicone.", avoid: "silicones" },
  { list: SULFATES, label: "Sulfate (tensioactif moussant).", avoid: "sulfates" },
  { list: ESSENTIAL_OILS, label: "Huile essentielle.", avoid: "huiles-essentielles" },
  { list: NANO, label: "Sous forme de nanoparticules.", avoid: "nano" },
];

const GOOD_LABEL: Record<keyof typeof GOOD_FOR, string> = {
  grasse: "les peaux grasses",
  seche: "les peaux sèches",
  sensible: "les peaux sensibles",
  rides: "les rides",
  taches: "les taches",
  rougeurs: "les rougeurs",
  acne: "les imperfections",
  pores: "les pores dilatés",
  "teint-terne": "le teint terne",
};

/** Explains one ingredient for this profile. Most important facts first (allergy, then avoid, warn, good, info). */
export function explainIngredient(name: string, profile: Profile | null): IngredientExplanation {
  const ing = name.toLowerCase().trim();
  const facts: IngredientFact[] = [];
  const avoid = new Set(profile?.avoid ?? []);

  const allergy = (profile?.allergies ?? []).find((a) => matchesAllergy(ing, a));
  if (allergy) facts.push({ kind: "allergy", text: `Vous êtes allergique à « ${allergy} ».` });

  for (const f of FAMILIES) {
    if (!has(ing, f.list)) continue;
    facts.push(f.avoid && avoid.has(f.avoid) ? { kind: "avoid", text: `${f.label} Vous préférez l'éviter.` } : { kind: "info", text: f.label });
  }
  if (hasDryingAlcohol([ing])) {
    facts.push(avoid.has("alcool") ? { kind: "avoid", text: "Alcool asséchant. Vous préférez l'éviter." } : { kind: "info", text: "Alcool asséchant." });
  }
  if (has(ing, EU_ALLERGENS)) facts.push({ kind: profile?.sensitive ? "warn" : "info", text: "Allergène parfumé que la loi européenne impose d'indiquer." });
  if (has(ing, CONTROVERSIAL)) facts.push({ kind: "warn", text: "Ingrédient controversé (irritant ou suspecté de perturber les hormones)." });
  if (has(ing, COMEDOGENIC)) {
    const oily = profile?.skinType === "grasse" || profile?.skinType === "mixte" || profile?.concerns.includes("acne");
    facts.push({ kind: oily ? "warn" : "info", text: "Peut boucher les pores." });
  }
  if (has(ing, SPF_FILTERS)) facts.push({ kind: "info", text: "Filtre solaire." });

  const mine = new Set<string>([profile?.skinType ?? "", ...(profile?.concerns ?? []), profile?.sensitive ? "sensible" : ""]);
  for (const key of Object.keys(GOOD_FOR) as (keyof typeof GOOD_FOR)[]) {
    if (has(ing, GOOD_FOR[key])) facts.push({ kind: mine.has(key) ? "good" : "info", text: `Utile pour ${GOOD_LABEL[key]}.` });
  }

  const order: FactKind[] = ["allergy", "avoid", "warn", "good", "info"];
  facts.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const key = ROLE_KEYS.find((k) => ing.includes(k));
  return { name: ing, role: key ? ROLES[key] : undefined, facts };
}

/** The strongest fact kind of an ingredient, to colour its chip (undefined: nothing notable). */
export function headlineKind(e: IngredientExplanation): FactKind | undefined {
  return e.facts[0]?.kind;
}

/** Families present in a formula, for a quick side-by-side comparison. */
export function formulaFlags(ingredients: string[]): string[] {
  const inList = (list: readonly string[]) => () => ingredients.some((i) => has(i, list));
  const checks: [present: () => boolean, label: string][] = [
    [inList(FRAGRANCE), "Parfum"],
    [inList(EU_ALLERGENS), "Allergènes parfumés"],
    [inList(PARABENS), "Parabènes"],
    [inList(SILICONES), "Silicones"],
    [() => hasDryingAlcohol(ingredients), "Alcool asséchant"],
    [inList(SULFATES), "Sulfates"],
    [inList(ESSENTIAL_OILS), "Huiles essentielles"],
    [inList(NANO), "Nanoparticules"],
    [inList(CONTROVERSIAL), "Ingrédients controversés"],
  ];
  return checks.filter(([present]) => present()).map(([, label]) => label);
}
