import { describe, expect, it } from "vitest";
import { ProfileSchema, StoredProfileSchema } from "./schemas";

const valid = {
  skinType: "seche",
  sensitive: true,
  skinTone: "clair",
  undertone: "froid",
  concerns: [],
  avoid: ["parfum"],
  prefs: [],
  allergies: ["linalool"],
  budget: 30,
};

describe("ProfileSchema repairs instead of erasing (audit M-2)", () => {
  it("keeps a long INCI allergy (the audit's proof of concept), shortened if needed", () => {
    const long = "methylchloroisothiazolinone and methylisothiazolinone mixture";
    const p = ProfileSchema.parse({ ...valid, allergies: ["linalool", long] });
    expect(p).not.toBeNull();
    expect(p?.allergies).toEqual(["linalool", long]);
    expect(ProfileSchema.parse({ ...valid, allergies: ["x".repeat(500)] })?.allergies[0]).toHaveLength(120);
  });

  it("keeps up to 50 allergies instead of dropping the profile at 31", () => {
    const many = Array.from({ length: 60 }, (_, i) => `allergene-${i}`);
    expect(ProfileSchema.parse({ ...valid, allergies: many })?.allergies).toHaveLength(50);
  });

  it("drops only the bad optional field", () => {
    const p = ProfileSchema.parse({ ...valid, city: 42, name: { evil: true }, concerns: ["not-a-concern"], budget: -5 });
    expect(p).toMatchObject({ allergies: ["linalool"], concerns: [], budget: 0 });
    expect(p?.city).toBeUndefined();
    expect(p?.name).toBeUndefined();
  });

  it("trims and caps the city instead of rejecting it", () => {
    expect(ProfileSchema.parse({ ...valid, city: `  ${"Lyon".repeat(40)}  ` })?.city).toHaveLength(80);
  });

  it("still returns null for something that is not a profile at all (read-only routes)", () => {
    expect(ProfileSchema.parse("garbage")).toBeNull();
    expect(ProfileSchema.parse({ ...valid, skinType: "bleue" })).toBeNull();
  });
});

describe("StoredProfileSchema never turns a bad profile into null (account sync)", () => {
  it("rejects instead of storing null", () => {
    expect(StoredProfileSchema.safeParse({ ...valid, skinType: "bleue" }).success).toBe(false);
  });

  it("accepts an explicit null (no profile yet) and repairs fields like the read schema", () => {
    expect(StoredProfileSchema.parse(null)).toBeNull();
    expect(StoredProfileSchema.parse({ ...valid, city: 42 })?.city).toBeUndefined();
  });
});
