import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { anthropicErrorResponse, parseBody, requireApiKey } from "@/lib/api-utils";
import { FALLBACK, MODEL, anthropic } from "@/lib/claude";
import { guard, recordUsage } from "@/lib/guard";
import { ShadeSchema } from "@/lib/schemas";

export const maxDuration = 60;

const Body = z.object({
  image: z.string().min(100).max(8_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  /** Explicit consent given in the app before the first upload (GDPR art. 9). */
  consent: z.literal(true),
});

const SYSTEM = `Tu es une maquilleuse professionnelle bienveillante. On te montre un selfie pour conseiller des teintes de maquillage.
Évalue uniquement la carnation (profondeur de la teinte de peau) et le sous-ton, à partir de la peau du visage, du cou et des veines visibles si possible.
Tiens compte de l'éclairage (lumière jaune, flash, filtres) et baisse la confiance s'il fausse les couleurs.
Ne commente pas l'apparence, l'âge, l'origine ou le physique de la personne. Ton chaleureux, vocabulaire simple, en français, sans emojis.`;

export async function POST(req: Request) {
  const noKey = requireApiKey();
  if (noKey) return noKey;
  const parsed = await parseBody(req, Body, (e) =>
    e.issues.some((i) => i.path[0] === "consent") ? "Consentement requis avant l'analyse de la photo." : "Image invalide",
  );
  if (!parsed.ok) return parsed.response;
  const blocked = await guard(req, "shade");
  if (blocked) return blocked;

  try {
    const response = await anthropic.beta.messages.parse(
      {
        model: MODEL,
        max_tokens: 4000,
        ...FALLBACK,
        output_config: { effort: "low", format: betaZodOutputFormat(ShadeSchema) },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: parsed.data.mediaType, data: parsed.data.image } },
              { type: "text", text: "Analyse ma carnation et mon sous-ton pour m'aider à choisir mon maquillage." },
            ],
          },
        ],
      },
      // maxDuration is 60 s: one 45 s attempt, no retry, so the platform never cuts us off first.
      { timeout: 45_000, maxRetries: 0 },
    );
    await recordUsage(response, "shade");
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "Analyse impossible avec cette photo. Essayez à la lumière du jour, sans filtre." }, { status: 422 });
    }
    return Response.json(response.parsed_output);
  } catch (err) {
    return anthropicErrorResponse(err, "shade", "Service d'analyse indisponible.");
  }
}
