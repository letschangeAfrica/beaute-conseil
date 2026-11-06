import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { FALLBACK, MODEL, anthropic, hasApiKey } from "@/lib/claude";

export const maxDuration = 60;

const Body = z.object({
  image: z.string().min(100).max(8_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const ShadeSchema = z.object({
  skinTone: z.enum(["tres-clair", "clair", "moyen", "mat", "fonce", "tres-fonce"]),
  undertone: z.enum(["chaud", "froid", "neutre", "olive", "inconnu"]),
  confidence: z.enum(["faible", "moyenne", "elevee"]),
  explanation: z.string().describe("2 phrases simples expliquant ce qui a été observé"),
  foundationTips: z.string().describe("Conseils concrets pour choisir sa teinte de fond de teint, 2-3 phrases"),
  colorsToTry: z.array(z.string()).describe("4 à 6 couleurs de rouge à lèvres / fard qui la mettront en valeur"),
  colorsToAvoid: z.array(z.string()).describe("2 à 4 couleurs moins flatteuses"),
  photoQualityNote: z.string().describe("Remarque sur l'éclairage de la photo, ou chaîne vide si bonne"),
});

const SYSTEM = `Tu es une maquilleuse professionnelle bienveillante. On te montre un selfie pour conseiller des teintes de maquillage.
Évalue uniquement la carnation (profondeur de la teinte de peau) et le sous-ton, à partir de la peau du visage, du cou et des veines visibles si possible.
Tiens compte de l'éclairage (lumière jaune, flash, filtres) et baisse la confiance s'il fausse les couleurs.
Ne commente pas l'apparence, l'âge, l'origine ou le physique de la personne. Ton chaleureux, vocabulaire simple, en français, sans emojis.`;

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return Response.json({ error: "Clé API Anthropic manquante (ANTHROPIC_API_KEY dans .env.local)." }, { status: 503 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Image invalide" }, { status: 400 });

  try {
    const response = await anthropic.beta.messages.parse({
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
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "Analyse impossible avec cette photo. Essayez à la lumière du jour, sans filtre." }, { status: 422 });
    }
    return Response.json(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Trop de demandes, réessayez dans une minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("shade", err.status, err.message);
      return Response.json({ error: "Service d'analyse indisponible." }, { status: 502 });
    }
    throw err;
  }
}
