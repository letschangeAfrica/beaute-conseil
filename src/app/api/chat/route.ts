import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ProfileSchema, searchAndScore } from "@/lib/catalog";
import { FALLBACK, MODEL, anthropic, hasApiKey, profileSummary } from "@/lib/claude";
import { PRICE_DOMAINS } from "@/lib/stores";
import type { Profile } from "@/lib/types";

export const maxDuration = 300;

const Body = z.object({
  profile: ProfileSchema,
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .min(1)
    .max(40),
});

const SYSTEM = `Tu es « Belle », une conseillère beauté indépendante qui aide une femme vivant en France à choisir son maquillage et ses soins.
Ta mission : lui recommander les produits qui lui conviennent vraiment (carnation, type de peau, allergies, budget) au meilleur prix, sans parti pris pour une marque.

Règles :
- Réponds toujours en français, avec des mots simples, des phrases courtes, chaleureuses. Pas de jargon sans l'expliquer.
- Sois concise : 3 à 6 phrases ou une courte liste. Elle lit sur son téléphone.
- N'utilise jamais d'emojis. Mise en forme autorisée : **gras** et listes à tirets uniquement (pas de titres ni de tableaux).
- Pour recommander des produits précis, utilise l'outil search_products (base Open Beauty Facts + score personnalisé). Les fiches produits s'affichent automatiquement sous ta réponse, tu n'as pas besoin de recopier tous les détails.
- Si elle demande un prix ou où acheter, utilise web_search sur les sites français et donne les prix en euros avec l'enseigne. Précise que les prix changent vite. N'invente jamais un prix.
- Respecte strictement ses allergies et ingrédients à éviter.
- Pour le teint, rappelle de tester la teinte sur la mâchoire à la lumière du jour.
- Tu n'es pas médecin : pour une réaction, une irritation forte ou un problème de peau persistant, conseille un pharmacien ou un dermatologue.`;

const searchTool: Anthropic.Beta.BetaTool = {
  name: "search_products",
  description:
    "Cherche des produits cosmétiques vendus en France et les classe selon le profil de l'utilisatrice (score 0-100 et raisons). Utilise des mots-clés courts en français ou en anglais, ex. « fond de teint », « mascara waterproof », « rouge à lèvres mat ».",
  strict: true,
  eager_input_streaming: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["query"],
    properties: { query: { type: "string", description: "Mots-clés de recherche" } },
  },
};
const SearchInput = z.object({ query: z.string().min(2).max(120) });

type Emit = (event: Record<string, unknown>) => void;

async function runSearch(input: unknown, profile: Profile | null, emit: Emit) {
  const parsed = SearchInput.safeParse(input);
  if (!parsed.success) return { content: "Entrée invalide : il faut un champ query (texte).", isError: true };
  emit({ type: "status", text: `Je cherche « ${parsed.data.query} »…` });
  try {
    const results = (await searchAndScore(parsed.data.query, profile, 6)).filter((r) => r.verdict !== "inconnu");
    emit({
      type: "products",
      items: results.map(({ code, name, brand, image, score, verdict }) => ({ code, name, brand, image, score, verdict })),
    });
    const compact = results.map((r) => ({
      code: r.code,
      nom: r.name,
      marque: r.brand,
      score: r.score,
      verdict: r.verdict,
      raisons: r.reasons.slice(0, 4).map((x) => `${x.kind === "plus" ? "+" : x.kind === "minus" ? "-" : "·"} ${x.text}`),
    }));
    return { content: compact.length ? JSON.stringify(compact) : "Aucun produit trouvé avec des ingrédients renseignés.", isError: false };
  } catch {
    return { content: "La base produits ne répond pas pour le moment.", isError: true };
  }
}

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return Response.json({ error: "Clé API Anthropic manquante (ANTHROPIC_API_KEY dans .env.local)." }, { status: 503 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Requête invalide" }, { status: 400 });
  const { profile } = parsed.data;

  const messages: Anthropic.Beta.BetaMessageParam[] = parsed.data.messages.map((m) => ({ role: m.role, content: m.content }));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (event) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        for (let turn = 0; turn < 8; turn++) {
          const response = anthropic.beta.messages.stream({
            model: MODEL,
            max_tokens: 64000,
            ...FALLBACK,
            output_config: { effort: "medium" },
            system: [
              { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
              { type: "text", text: profileSummary(profile) },
            ],
            tools: [
              searchTool,
              {
                type: "web_search_20260209",
                name: "web_search",
                max_uses: 4,
                allowed_domains: PRICE_DOMAINS,
                user_location: { type: "approximate", country: "FR", ...(profile?.city ? { city: profile.city } : {}) },
              },
            ],
            messages,
          });

          for await (const event of response) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              emit({ type: "text", text: event.delta.text });
            } else if (event.type === "content_block_start" && event.content_block.type === "server_tool_use") {
              emit({ type: "status", text: "Je vérifie les prix en ligne…" });
            }
          }
          const final = await response.finalMessage();
          messages.push({ role: "assistant", content: final.content });

          if (final.stop_reason === "refusal") {
            emit({ type: "text", text: "\n\nDésolée, je ne peux pas répondre à cette demande." });
            break;
          }
          if (final.stop_reason === "pause_turn") continue;
          if (final.stop_reason !== "tool_use") break; // end_turn, or max_tokens on plain text

          const calls = final.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
          const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
          for (const call of calls) {
            const r =
              call.name === "search_products"
                ? await runSearch(call.input, profile, emit)
                : { content: `Outil inconnu : ${call.name}`, isError: true };
            results.push({ type: "tool_result", tool_use_id: call.id, content: r.content, is_error: r.isError });
          }
          messages.push({ role: "user", content: results });
        }
      } catch (err) {
        console.error("chat", err);
        const msg =
          err instanceof Anthropic.RateLimitError
            ? "Trop de demandes, réessayez dans une minute."
            : "Oups, la conseillère est momentanément indisponible.";
        emit({ type: "error", text: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
