import { z } from "zod";
import {
  AVOID_VALUES,
  CONCERN_VALUES,
  CONFIDENCE_VALUES,
  PREF_VALUES,
  SKIN_TONE_VALUES,
  SKIN_TYPE_VALUES,
  UNDERTONE_VALUES,
} from "./types";

/**
 * Runtime schemas, built from the enum arrays in ./types.ts.
 * Isomorphic (no "server-only"), so the client may reuse them too.
 */

/** Structured output of the selfie analysis (also used as Claude's output format in /api/shade). */
export const ShadeSchema = z.object({
  skinTone: z.enum(SKIN_TONE_VALUES),
  undertone: z.enum(UNDERTONE_VALUES),
  confidence: z.enum(CONFIDENCE_VALUES),
  explanation: z.string().describe("2 phrases simples expliquant ce qui a été observé"),
  foundationTips: z.string().describe("Conseils concrets pour choisir sa teinte de fond de teint, 2-3 phrases"),
  colorsToTry: z.array(z.string()).describe("4 à 6 couleurs de rouge à lèvres / fard qui la mettront en valeur"),
  colorsToAvoid: z.array(z.string()).describe("2 à 4 couleurs moins flatteuses"),
  photoQualityNote: z.string().describe("Remarque sur l'éclairage de la photo, ou chaîne vide si bonne"),
});
export type ShadeAnalysis = z.infer<typeof ShadeSchema>;

/** Loose runtime validation of a profile coming from the browser. */
export const ProfileSchema = z
  .object({
    name: z.string().max(60).optional(),
    skinType: z.enum(SKIN_TYPE_VALUES),
    sensitive: z.boolean(),
    skinTone: z.enum(SKIN_TONE_VALUES),
    undertone: z.enum(UNDERTONE_VALUES),
    concerns: z.array(z.enum(CONCERN_VALUES)).max(10),
    avoid: z.array(z.enum(AVOID_VALUES)).max(10),
    prefs: z.array(z.enum(PREF_VALUES)).max(5),
    allergies: z.array(z.string().max(60)).max(30),
    budget: z.number().min(0).max(1000),
    city: z.string().max(80).optional(),
    // A stale or malformed shadeAdvice is dropped on its own instead of nulling the whole profile.
    shadeAdvice: ShadeSchema.optional().catch(undefined),
  })
  .nullable()
  .catch(null);
