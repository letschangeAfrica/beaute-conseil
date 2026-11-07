import { describe, expect, it } from "vitest";
import { explainIngredient, formulaFlags, headlineKind } from "./ingredientInfo";
import { parseIngredients } from "./ingredients";
import type { Profile } from "./types";

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

describe("explainIngredient", () => {
  it("puts her allergy first, with the same matching as the score (French spelling)", () => {
    const e = explainIngredient("lanolin alcohol", profile({ allergies: ["Lanoline"] }));
    expect(e.facts[0]).toEqual({ kind: "allergy", text: expect.stringContaining("Lanoline") });
    expect(headlineKind(e)).toBe("allergy");
    expect(e.role).toMatch(/Lanoline/);
  });

  it("marks a family she avoids", () => {
    expect(headlineKind(explainIngredient("dimethicone", profile({ avoid: ["silicones"] })))).toBe("avoid");
    expect(headlineKind(explainIngredient("dimethicone", profile()))).toBe("info");
  });

  it("recognises drying alcohol but not fatty alcohols", () => {
    expect(explainIngredient("alcohol denat", profile({ avoid: ["alcool"] })).facts[0].kind).toBe("avoid");
    expect(explainIngredient("cetearyl alcohol", profile({ avoid: ["alcool"] })).facts).toEqual([]);
  });

  it("highlights benefits only for her skin and concerns", () => {
    expect(explainIngredient("niacinamide", profile({ concerns: ["taches"] })).facts.some((f) => f.kind === "good")).toBe(true);
    expect(explainIngredient("niacinamide", profile()).facts.every((f) => f.kind === "info")).toBe(true);
  });

  it("warns oily skin about pore-clogging ingredients", () => {
    expect(headlineKind(explainIngredient("isopropyl myristate", profile({ skinType: "grasse" })))).toBe("warn");
    expect(headlineKind(explainIngredient("isopropyl myristate", profile()))).toBe("info");
  });

  it("explains the role of common ingredients and stays silent on unknown ones", () => {
    expect(explainIngredient("aqua", null).role).toMatch(/Eau/);
    const unknown = explainIngredient("hydrogenated polyisobutene", null);
    expect(unknown.role).toBeUndefined();
    expect(unknown.facts).toEqual([]);
  });

  it("works without a profile", () => {
    expect(headlineKind(explainIngredient("linalool", null))).toBe("info");
  });
});

describe("formulaFlags", () => {
  it("lists the families present", () => {
    const ings = parseIngredients("Aqua, Alcohol Denat., Parfum, Linalool, Dimethicone, Methylparaben");
    expect(formulaFlags(ings)).toEqual(["Parfum", "Allergènes parfumés", "Parabènes", "Silicones", "Alcool asséchant"]);
  });

  it("is empty for a simple formula", () => {
    expect(formulaFlags(parseIngredients("Aqua, Glycerin, Tocopherol"))).toEqual([]);
  });
});
