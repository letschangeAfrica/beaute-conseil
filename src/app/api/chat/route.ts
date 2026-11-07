import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { parseBody, requireApiKey } from "@/lib/api-utils";
import { ProfileSchema, searchAndScore } from "@/lib/catalog";
import { FALLBACK, MODEL, anthropic, profileSummary } from "@/lib/claude";
import { guard, overBudget, recordUsage } from "@/lib/guard";
import { PRICE_DOMAINS } from "@/lib/stores";
import type { ChatEvent, Profile } from "@/lib/types";
import { cleanText, fence, UNTRUSTED_RULE } from "@/lib/untrusted";
import { CHAT_LIMITS } from "@/lib/utils";

export const maxDuration = 300;

// Same caps as the advisor page uses (fitChatHistory): the server enforces them, the page just stays inside them.
const Body = z.object({
  profile: ProfileSchema,
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(CHAT_LIMITS.maxMessageChars) }))
    .min(1)
    .max(CHAT_LIMITS.maxMessages)
    .refine((ms) => ms.reduce((n, m) => n + m.content.length, 0) <= CHAT_LIMITS.maxHistoryChars, "Conversation trop longue"),
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
- Tu n'es pas médecin : pour une réaction, une irritation forte ou un problème de peau persistant, conseille un pharmacien ou un dermatologue.

${UNTRUSTED_RULE}`;

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

/** Writes one NDJSON event to the client. The ChatEvent type is shared with conseillere/page.tsx. */
type Emit = (event: ChatEvent) => void;

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
    // Names and brands come from Open Beauty Facts, which anyone can edit: cleaned, capped and fenced as data.
    // Scores and reasons are computed by Belle, but the reasons quote ingredient names, so they are cleaned too.
    const compact = results.map((r) => ({
      code: r.code,
      nom: cleanText(r.name, 120),
      marque: cleanText(r.brand, 60),
      score: r.score,
      verdict: r.verdict,
      raisons: r.reasons.slice(0, 4).map((x) => cleanText(`${x.kind === "plus" ? "+" : x.kind === "minus" ? "-" : "·"} ${x.text}`, 200)),
    }));
    return {
      content: compact.length ? fence("open-beauty-facts", JSON.stringify(compact)) : "Aucun produit trouvé avec des ingrédients renseignés.",
      isError: false,
    };
  } catch {
    return { content: "La base produits ne répond pas pour le moment.", isError: true };
  }
}

export async function POST(req: Request) {
  const noKey = requireApiKey();
  if (noKey) return noKey;
  const parsed = await parseBody(req, Body, (e) =>
    e.issues.some((i) => i.path[0] === "messages")
      ? "Conversation trop longue : commencez une nouvelle conversation."
      : "Requête invalide",
  );
  if (!parsed.ok) return parsed.response;
  const blocked = await guard(req, "chat");
  if (blocked) return blocked;
  const { profile } = parsed.data;

  const messages: Anthropic.Beta.BetaMessageParam[] = parsed.data.messages.map((m) => ({ role: m.role, content: m.content }));
  const encoder = new TextEncoder();

  // Set when the visitor closes the page: stop generating, and stop writing to a closed stream.
  let closed = false;
  let response: ReturnType<typeof anthropic.beta.messages.stream> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (event) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          closed = true; // the client went away between two events
          response?.abort();
        }
      };
      try {
        for (let turn = 0; turn < 8 && !closed; turn++) {
          if (turn > 0 && (await overBudget())) {
            emit({ type: "text", text: "\n\nJe dois m'arrêter là pour aujourd'hui, réessayez demain." });
            break;
          }
          const turnStream = anthropic.beta.messages.stream({
            model: MODEL,
            max_tokens: CHAT_LIMITS.maxOutputTokens, // replies are 3–6 sentences; bounds the cost of a turn
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
          response = turnStream; // so cancel() / a failed emit can abort the turn in flight

          try {
            for await (const event of turnStream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                emit({ type: "text", text: event.delta.text });
              } else if (event.type === "content_block_start" && event.content_block.type === "server_tool_use") {
                emit({ type: "status", text: "Je vérifie les prix en ligne…" });
              }
            }
          } finally {
            // An aborted turn never reaches finalMessage(): still count the tokens it used against the budget.
            // (Lower bound: the final output count only arrives with the last stream event.)
            if (closed) await recordUsage(turnStream.currentMessage, "chat (client left)");
          }
          const final = await turnStream.finalMessage();
          await recordUsage(final, "chat");
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
        if (closed) return; // the visitor left: the abort is expected, not an error
        const requestId = err instanceof Anthropic.APIError ? ` request-id=${err.requestID ?? "-"}` : "";
        console.error(`[chat]${requestId}`, err);
        const msg =
          err instanceof Anthropic.RateLimitError
            ? "Trop de demandes, réessayez dans une minute."
            : "Oups, la conseillère est momentanément indisponible.";
        emit({ type: "error", text: msg });
      } finally {
        if (!closed) controller.close();
      }
    },
    cancel() {
      closed = true;
      response?.abort();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
