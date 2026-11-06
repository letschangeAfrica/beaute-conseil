import { describe, expect, it } from "vitest";
import { findAny, hasDryingAlcohol, parseIngredients } from "./ingredients";
import { isComplexionProduct, scoreProduct, verdictFor } from "./scoring";
import type { PricePoint, Product, Profile } from "./types";

/* ---------- Fixtures -------------------------------------------------- */

const product = (over: Partial<Product> = {}): Product => ({
  code: "3600000000000",
  name: "Crème test",
  brand: "Marque",
  ingredientsText: "Aqua, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Tocopherol",
  categories: [],
  labels: [],
  scans: 0,
  ...over,
});

const profile = (over: Partial<Profile> = {}): Profile => ({
  skinType: "normale",
  sensitive: false,
  skinTone: "moyen",
  undertone: "neutre",
  concerns: [],
  avoid: [],
  prefs: [],
  allergies: [],
  budget: 25,
  ...over,
});

const price = (p: number): PricePoint => ({ price: p, currency: "EUR", date: "2026-11-01", store: "Test", source: "open-prices" });

/** Score difference a profile change makes on the same product. */
const delta = (prod: Product, a: Profile | null, b: Profile | null, pp?: PricePoint) => scoreProduct(prod, b, pp).score - scoreProduct(prod, a, pp).score;

const texts = (r: ReturnType<typeof scoreProduct>) => r.reasons.map((x) => x.text).join(" | ");

/* ---------- Allergies: the safety-critical part ----------------------- */

describe("allergies", () => {
  const withLinalool = product({ ingredientsText: "Aqua, Glycerin, Parfum, Linalool, Limonene" });

  it("flags an allergen she listed, caps the score at 15 and forces « à éviter »", () => {
    const r = scoreProduct(withLinalool, profile({ allergies: ["linalool"] }));
    expect(r.allergyHit).toEqual(["linalool"]);
    expect(r.verdict).toBe("eviter");
    expect(r.score).toBeLessThanOrEqual(15);
    expect(r.reasons[0]).toEqual({ kind: "minus", text: expect.stringContaining("vous y êtes allergique") });
  });

  it("is case- and whitespace-insensitive on her input", () => {
    expect(scoreProduct(withLinalool, profile({ allergies: ["  LINALOOL "] })).allergyHit).toEqual(["linalool"]);
  });

  it("matches inside longer INCI names (e.g. « lanolin » in « lanolin alcohol »)", () => {
    const p = product({ ingredientsText: "Aqua, Lanolin Alcohol, Glycerin" });
    expect(scoreProduct(p, profile({ allergies: ["lanolin"] })).allergyHit).toEqual(["lanolin"]);
  });

  it("cannot be outweighed by many positives", () => {
    const loaded = product({
      name: "Fond de teint mat oil-free SPF 30",
      ingredientsText: "Aqua, Niacinamide, Salicylic Acid, Zinc Oxide, Kaolin, Allantoin, Bisabolol, Centella Asiatica Extract, Linalool",
      labels: ["en:vegan", "en:organic"],
      scans: 500,
    });
    const r = scoreProduct(
      loaded,
      profile({ skinType: "grasse", sensitive: true, concerns: ["acne", "pores", "rougeurs"], prefs: ["vegan", "bio"], allergies: ["linalool"] }),
      price(5),
    );
    expect(r.score).toBeLessThanOrEqual(15);
    expect(r.verdict).toBe("eviter");
  });

  it("reports every allergen found, not just the first", () => {
    const r = scoreProduct(withLinalool, profile({ allergies: ["linalool", "limonene", "nickel"] }));
    expect(r.allergyHit?.sort()).toEqual(["limonene", "linalool"]);
  });

  it("leaves products without her allergens alone", () => {
    const r = scoreProduct(product(), profile({ allergies: ["linalool"] }));
    expect(r.allergyHit).toBeUndefined();
    expect(r.verdict).not.toBe("eviter");
  });

  it("ignores empty allergy entries", () => {
    expect(scoreProduct(withLinalool, profile({ allergies: ["", "   "] })).allergyHit).toBeUndefined();
  });

  it("still warns when the ingredient list is very short (single-ingredient products)", () => {
    const pure = product({ name: "Lanoline pure", ingredientsText: "Lanolin" });
    const r = scoreProduct(pure, profile({ allergies: ["lanolin"] }));
    expect(r.allergyHit).toEqual(["lanolin"]);
    expect(r.verdict).toBe("eviter");
  });

  it("understands the French spelling she is likely to type (« lanoline »)", () => {
    const p = product({ ingredientsText: "Aqua, Lanolin, Glycerin" });
    expect(scoreProduct(p, profile({ allergies: ["Lanoline"] })).allergyHit).toEqual(["lanoline"]);
    expect(scoreProduct(p, profile({ allergies: ["glycérine"] })).allergyHit).toEqual(["glycérine"]);
  });

  it("does not over-trim short words (« aloe » stays « aloe »)", () => {
    const p = product({ ingredientsText: "Aqua, Glycerin, Aloe Barbadensis Leaf Juice" });
    expect(scoreProduct(p, profile({ allergies: ["aloe"] })).allergyHit).toEqual(["aloe"]);
  });
});

/* ---------- Missing data ---------------------------------------------- */

describe("missing ingredient list", () => {
  it("returns « inconnu » with a neutral score and says why", () => {
    const r = scoreProduct(product({ ingredientsText: "" }), profile());
    expect(r.verdict).toBe("inconnu");
    expect(r.score).toBe(50);
    expect(r.reasons[0].kind).toBe("info");
  });

  it("does not run ingredient rules on fewer than 3 ingredients", () => {
    const r = scoreProduct(product({ ingredientsText: "Aqua, Parfum" }), profile({ sensitive: true, avoid: ["parfum"] }));
    expect(texts(r)).not.toMatch(/parfum/i);
  });

  it("still applies budget and label rules", () => {
    const r = scoreProduct(product({ ingredientsText: "", labels: ["en:vegan"] }), profile({ prefs: ["vegan"] }), price(10));
    expect(texts(r)).toMatch(/Vegan/);
    expect(texts(r)).toMatch(/Dans votre budget/);
  });
});

/* ---------- Ingredient rules ------------------------------------------ */

describe("fragrance", () => {
  const perfumed = product({ ingredientsText: "Aqua, Glycerin, Parfum, Tocopherol" });

  it("rewards fragrance-free formulas more for sensitive skin", () => {
    const normal = scoreProduct(product(), profile());
    const sensitive = scoreProduct(product(), profile({ sensitive: true }));
    expect(texts(normal)).toMatch(/Sans parfum/);
    expect(sensitive.score).toBeGreaterThan(normal.score);
  });

  it("penalises perfume when she avoids it or has sensitive skin", () => {
    expect(delta(perfumed, profile(), profile({ avoid: ["parfum"] }))).toBe(-12);
    expect(texts(scoreProduct(perfumed, profile({ sensitive: true })))).toMatch(/déconseillé pour vous/);
  });

  it("only informs otherwise", () => {
    const r = scoreProduct(perfumed, profile());
    expect(r.reasons).toContainEqual({ kind: "info", text: "Contient du parfum." });
  });

  it("recognises « fragrance » and « aroma » too", () => {
    for (const word of ["Fragrance", "Aroma"]) {
      const r = scoreProduct(product({ ingredientsText: `Aqua, Glycerin, ${word}` }), profile({ avoid: ["parfum"] }));
      expect(texts(r)).toMatch(/Contient du parfum/);
    }
  });
});

describe("avoid list", () => {
  const cases: [Profile["avoid"][number], string][] = [
    ["parabenes", "Aqua, Glycerin, Methylparaben"],
    ["silicones", "Aqua, Dimethicone, Glycerin"],
    ["sulfates", "Aqua, Sodium Laureth Sulfate, Glycerin"],
    ["alcool", "Alcohol Denat., Aqua, Glycerin"],
    ["huiles-essentielles", "Aqua, Glycerin, Lavandula Angustifolia Flower Oil"],
    ["nano", "Aqua, Glycerin, Titanium Dioxide [nano]"],
  ];
  it.each(cases)("penalises %s only when she avoids it", (avoid, inci) => {
    const p = product({ ingredientsText: inci });
    expect(delta(p, profile(), profile({ avoid: [avoid] }))).toBe(-10);
  });

  it("does not treat fatty alcohols as drying alcohol", () => {
    const p = product({ ingredientsText: "Aqua, Cetearyl Alcohol, Cetyl Alcohol, Glycerin" });
    expect(delta(p, profile(), profile({ avoid: ["alcool"] }))).toBe(0);
  });
});

describe("controversial ingredients", () => {
  it("penalises each one and names them", () => {
    const r = scoreProduct(product({ ingredientsText: "Aqua, Glycerin, Methylisothiazolinone, Triclosan" }), null);
    expect(r.reasons[0]).toEqual({ kind: "minus", text: expect.stringContaining("methylisothiazolinone, triclosan") });
  });

  it("are penalised regardless of profile", () => {
    const clean = scoreProduct(product(), null).score;
    const dirty = scoreProduct(product({ ingredientsText: "Aqua, Glycerin, Cetearyl Alcohol, Tocopherol, Triclosan" }), null).score;
    expect(dirty).toBeLessThan(clean);
  });
});

describe("skin type", () => {
  const comedogenic = product({ ingredientsText: "Aqua, Isopropyl Myristate, Cocos Nucifera Oil, Glycerin" });

  it("warns oily and acne-prone skin about pore-clogging ingredients", () => {
    for (const p of [profile({ skinType: "grasse" }), profile({ skinType: "mixte" }), profile({ concerns: ["acne"] })]) {
      expect(texts(scoreProduct(comedogenic, p))).toMatch(/boucher les pores/);
    }
    expect(texts(scoreProduct(comedogenic, profile()))).not.toMatch(/boucher les pores/);
  });

  it("rewards hydrating ingredients for dry skin and penalises drying alcohol", () => {
    const hydrating = product({ ingredientsText: "Aqua, Glycerin, Sodium Hyaluronate, Squalane" });
    expect(delta(hydrating, profile(), profile({ skinType: "seche" }))).toBeGreaterThan(0);
    const drying = product({ ingredientsText: "Alcohol Denat., Aqua, Parfum" });
    expect(texts(scoreProduct(drying, profile({ skinType: "seche" })))).toMatch(/assécher/);
  });

  it("uses the finish in the name (mat vs glow)", () => {
    // No hydrating ingredients here, so only the finish rule differs between skin types.
    const matte = product({ name: "Fond de teint Matte", ingredientsText: "Aqua, Talc, Mica, Tocopherol" });
    expect(delta(matte, profile(), profile({ skinType: "grasse" }))).toBeGreaterThan(0);
    expect(delta(matte, profile(), profile({ skinType: "seche" }))).toBeLessThan(0);
  });
});

describe("concerns", () => {
  it("rewards actives that target her concerns", () => {
    const p = product({ ingredientsText: "Aqua, Niacinamide, Glycerin" });
    const r = scoreProduct(p, profile({ concerns: ["taches"] }));
    expect(texts(r)).toMatch(/Actifs pour les taches/);
  });

  it("rewards sun protection for dark spots", () => {
    const p = product({ name: "Crème SPF 50", ingredientsText: "Aqua, Glycerin, Zinc Oxide" });
    expect(texts(scoreProduct(p, profile({ concerns: ["taches"] })))).toMatch(/protection solaire/);
  });
});

/* ---------- General rules --------------------------------------------- */

describe("budget", () => {
  it.each([
    [20, 5],
    [30, -4],
    [40, -10],
  ])("price %d € with a 25 € budget changes the score by %d", (p, expected) => {
    const withPrice = scoreProduct(product(), profile({ budget: 25 }), price(p)).score;
    const without = scoreProduct(product(), profile({ budget: 25 })).score;
    expect(withPrice - without).toBe(expected);
  });

  it("is skipped when no price is known", () => {
    expect(texts(scoreProduct(product(), profile()))).not.toMatch(/budget/);
  });
});

describe("labels", () => {
  it("rewards vegan / organic only when she asked for it", () => {
    const p = product({ labels: ["en:vegan", "fr:ecocert"] });
    expect(delta(p, profile(), profile({ prefs: ["vegan", "bio"] }))).toBe(12);
  });
});

/* ---------- Output contract ------------------------------------------- */

describe("score and verdict", () => {
  it("always stays between 0 and 100", () => {
    const awful = product({
      ingredientsText: "Alcohol Denat., Parfum, Methylparaben, Dimethicone, Sodium Lauryl Sulfate, Triclosan, BHT, Formaldehyde, DMDM Hydantoin, Isopropyl Myristate, Linalool, Limonene, Citral, Geraniol",
      name: "Poudre matte",
    });
    const harsh = profile({ skinType: "seche", sensitive: true, avoid: ["parfum", "parabenes", "silicones", "sulfates", "alcool"] });
    expect(scoreProduct(awful, harsh, price(99)).score).toBe(0);

    const great = product({ ingredientsText: "Aqua, Glycerin, Sodium Hyaluronate, Squalane, Ceramide NP, Panthenol", labels: ["en:vegan", "en:organic"], scans: 999 });
    expect(scoreProduct(great, profile({ skinType: "seche", prefs: ["vegan", "bio"] }), price(5)).score).toBeLessThanOrEqual(100);
  });

  it("maps score bands to verdicts", () => {
    expect(verdictFor(75, true)).toBe("excellent");
    expect(verdictFor(74, true)).toBe("bon");
    expect(verdictFor(60, true)).toBe("bon");
    expect(verdictFor(59, true)).toBe("moyen");
    expect(verdictFor(40, true)).toBe("moyen");
    expect(verdictFor(39, true)).toBe("eviter");
    expect(verdictFor(90, false)).toBe("inconnu");
  });

  it("works without a profile", () => {
    const r = scoreProduct(product(), null);
    expect(r.score).toBeGreaterThan(0);
    expect(r.allergyHit).toBeUndefined();
  });

  it("is deterministic", () => {
    const p = product({ ingredientsText: "Aqua, Parfum, Niacinamide, Dimethicone" });
    const pr = profile({ concerns: ["acne"], avoid: ["silicones"] });
    expect(scoreProduct(p, pr)).toEqual(scoreProduct(p, pr));
  });
});

/* ---------- Ingredient helpers ---------------------------------------- */

describe("parseIngredients", () => {
  it("splits, lower-cases and trims", () => {
    expect(parseIngredients("Aqua, Glycerin ;  Parfum")).toEqual(["aqua", "glycerin", "parfum"]);
  });

  it("removes the FIL code and asterisks", () => {
    expect(parseIngredients("Aqua, Butyrospermum Parkii Butter*, (F.I.L. B12345/1)")).toEqual(["aqua", "butyrospermum parkii butter"]);
  });

  it("splits « may contain » shade lists", () => {
    expect(parseIngredients("Aqua, Mica [+/- CI 77491, CI 77492]")).toContain("ci 77492]");
    expect(parseIngredients("Talc may contain CI 77891")).toEqual(["talc", "ci 77891"]);
  });
});

describe("helpers", () => {
  it("findAny returns each needle once", () => {
    expect(findAny(["methylparaben", "propylparaben"], ["paraben"])).toEqual(["paraben"]);
  });

  it("hasDryingAlcohol", () => {
    expect(hasDryingAlcohol(["alcohol denat"])).toBe(true);
    expect(hasDryingAlcohol(["cetearyl alcohol"])).toBe(false);
  });

  it("isComplexionProduct detects foundations by category or name", () => {
    expect(isComplexionProduct(product({ categories: ["en:foundations"] }))).toBe(true);
    expect(isComplexionProduct(product({ name: "Correcteur anticernes" }))).toBe(true);
    expect(isComplexionProduct(product({ name: "Mascara" }))).toBe(false);
  });
});
