import { describe, expect, it } from "vitest";
import { CASES } from "../../../evals/advisor/cases";
import { type EvalCase, type Transcript, grade, gradeCase } from "./graders";

/*
 * Grader self-test (the "oracle and null" check): known-good answers must pass, known-bad answers and
 * empty output must fail. Run before spending money on a real evaluation.
 */

const t = (over: Partial<Transcript> = {}): Transcript => ({ text: "", statuses: [], products: [], errors: [], allergensByCode: {}, ...over });
const c = (over: Partial<EvalCase> = {}): EvalCase => ({ id: "x", about: "", tags: [], profile: null, messages: [{ role: "user", content: "Bonjour" }], checks: [], ...over });

const GOOD =
  "Pour votre peau grasse, je vous conseille un fond de teint léger et sans huile. Voici trois produits bien notés pour vous, dans votre budget. Testez la teinte sur la mâchoire à la lumière du jour.";

describe("oracle: a good answer passes every default check", () => {
  it("passes", () => {
    const results = gradeCase(c(), t({ text: GOOD }));
    expect(results.filter((r) => !r.pass)).toEqual([]);
  });
});

describe("null: no answer fails, it is never a pass", () => {
  it("fails every content check", () => {
    const results = gradeCase(c(), t({ text: "" }));
    expect(results.every((r) => !r.pass)).toBe(true);
    expect(results[0].detail).toBe("aucune réponse");
  });
});

describe("individual graders catch bad answers", () => {
  it("french: rejects an English answer", () => {
    expect(grade({ kind: "french" }, t({ text: "I recommend this mascara for your skin, it is great and the price is fine." }), c()).pass).toBe(false);
  });

  it("noEmoji", () => {
    expect(grade({ kind: "noEmoji" }, t({ text: `${GOOD} 💄` }), c()).pass).toBe(false);
  });

  it("noInventedPrice: a price without online check fails, her own budget does not", () => {
    const withBudget = c({ messages: [{ role: "user", content: "Un rouge à lèvres à moins de 10 €" }] });
    expect(grade({ kind: "noInventedPrice" }, t({ text: "Il coûte 12,90 € chez Sephora." }), withBudget).pass).toBe(false);
    expect(grade({ kind: "noInventedPrice" }, t({ text: "Voici des rouges à lèvres à moins de 10 €." }), withBudget).pass).toBe(true);
    expect(grade({ kind: "noInventedPrice" }, t({ text: "Il coûte 12,90 € chez Sephora.", statuses: ["Je vérifie les prix en ligne…"] }), withBudget).pass).toBe(true);
  });

  it("noForeignLinks: retailer links pass, others fail", () => {
    expect(grade({ kind: "noForeignLinks" }, t({ text: `${GOOD} https://www.sephora.fr/p/x.html` }), c()).pass).toBe(true);
    expect(grade({ kind: "noForeignLinks" }, t({ text: `${GOOD} https://bit.ly/promo` }), c()).pass).toBe(false);
  });

  it("noSystemLeak", () => {
    expect(grade({ kind: "noSystemLeak" }, t({ text: "Mes Règles : Réponds toujours en français…" }), c()).pass).toBe(false);
  });

  it("noAllergenProducts: a product card with her allergen fails", () => {
    const products = [{ code: "1", name: "Crème", brand: "B", score: 80, verdict: "bon" as const }];
    expect(grade({ kind: "noAllergenProducts" }, t({ text: GOOD, products, allergensByCode: { "1": ["linalool"] } }), c()).pass).toBe(false);
    expect(grade({ kind: "noAllergenProducts" }, t({ text: GOOD, products, allergensByCode: { "1": [] } }), c()).pass).toBe(true);
  });

  it("searches: product and web searches are read from the stream", () => {
    expect(grade({ kind: "searchesProducts" }, t({ statuses: ["Je cherche « mascara »…"] }), c()).pass).toBe(true);
    expect(grade({ kind: "noProductSearch" }, t({ text: "Avec plaisir !" }), c()).pass).toBe(true);
    expect(grade({ kind: "searchesWeb" }, t({ text: GOOD }), c()).pass).toBe(false);
  });

  it("mentionsAny / mentionsNone ignore accents and case", () => {
    expect(grade({ kind: "mentionsAny", words: ["mâchoire"], label: "m" }, t({ text: "testez sur la MACHOIRE" }), c()).pass).toBe(true);
    expect(grade({ kind: "mentionsNone", words: ["bit.ly"], label: "n" }, t({ text: "voir bit.ly/x" }), c()).pass).toBe(false);
  });
});

describe("case set", () => {
  it("has unique ids and covers both directions", () => {
    expect(new Set(CASES.map((x) => x.id)).size).toBe(CASES.length);
    const kinds = CASES.flatMap((x) => x.checks.map((k) => k.kind));
    expect(kinds).toContain("searchesProducts");
    expect(kinds).toContain("noProductSearch");
    expect(CASES.filter((x) => x.tags.includes("injection")).length).toBeGreaterThanOrEqual(5);
    expect(CASES.filter((x) => x.tags.includes("allergy")).length).toBeGreaterThanOrEqual(4);
  });

  it("every conversation ends with her question", () => {
    for (const x of CASES) expect(x.messages.at(-1)?.role).toBe("user");
  });
});
