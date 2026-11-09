import { z } from "zod";
import {
  AVOID_VALUES,
  CONCERN_VALUES,
  CONFIDENCE_VALUES,
  PREF_VALUES,
  SKIN_TONE_VALUES,
  SKIN_TYPE_VALUES,
  UNDERTONE_VALUES,
  PROFILE_LIMITS,
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

/** Trimmed and shortened text: an over-long value is cut, never a reason to reject the profile. */
const text = (max: number) => z.string().transform((s) => s.trim().slice(0, max));

/**
 * The profile, repaired field by field (audit M-2). Before, one invalid field (a 61-character INCI name,
 * 31 allergies, an 81-character city) turned the WHOLE profile into null: allergy warnings vanished
 * without notice and sync overwrote the other devices with nothing. Now each optional field falls back
 * on its own, and allergies (safety data) are shortened, never dropped.
 */
export const ProfileFields = z.object({
  name: text(PROFILE_LIMITS.nameChars).optional().catch(undefined),
  skinType: z.enum(SKIN_TYPE_VALUES),
  sensitive: z.boolean(),
  skinTone: z.enum(SKIN_TONE_VALUES),
  undertone: z.enum(UNDERTONE_VALUES),
  concerns: z.array(z.enum(CONCERN_VALUES)).max(10).catch([]),
  avoid: z.array(z.enum(AVOID_VALUES)).max(10).catch([]),
  prefs: z.array(z.enum(PREF_VALUES)).max(5).catch([]),
  allergies: z.array(text(PROFILE_LIMITS.allergyChars)).transform((a) => a.filter(Boolean).slice(0, PROFILE_LIMITS.allergies)),
  budget: z.number().min(0).max(1000).catch(0),
  city: text(PROFILE_LIMITS.cityChars).optional().catch(undefined),
  // A stale or malformed shadeAdvice is dropped on its own instead of nulling the whole profile.
  shadeAdvice: ShadeSchema.optional().catch(undefined),
});

/** Read-only routes (search, product, chat): an unusable profile means "no profile", the request still works. */
export const ProfileSchema = ProfileFields.nullable().catch(null);

/** Account sync (/api/me): an unusable profile is a 400, never stored as null over her other devices. */
export const StoredProfileSchema = ProfileFields.nullable();
