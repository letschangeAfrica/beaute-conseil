import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { FALLBACK, MODEL, anthropic, hasApiKey } from "@/lib/claude";
import { guard, recordUsage } from "@/lib/guard";
import { kv } from "@/lib/kv";
import { PRICE_DOMAINS } from "@/lib/stores";
import type { PricePoint } from "@/lib/types";

export const maxDuration = 120;

/** How long a price search is reused: 6 h when offers were found, 1 h when none were (retry sooner). */
const CACHE_HIT_TTL = 6 * 3600;
const CACHE_MISS_TTL = 3600;

interface LiveReport {
  offers: PricePoint[];
  summary: string;
  checkedAt: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const Body = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(100).default(""),
  code: z.string().max(20).optional(),
  quantity: z.string().max(50).optional(),
  city: z.string().max(80).optional(),
});

const Offer = z.object({
  store: z.string(),
  price_eur: z.number(),
  url: z.string(),
  in_stock: z.boolean(),
  note: z.string(),
});
const Report = z.object({ offers: z.array(Offer), summary: z.string() });

const reportTool: Anthropic.Beta.BetaTool = {
  name: "report_prices",
  description:
    "Enregistre les offres trouvées. À appeler UNE fois, à la fin, avec uniquement des prix lus sur les pages de résultats de recherche.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["offers", "summary"],
    properties: {
      offers: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["store", "price_eur", "url", "in_stock", "note"],
          properties: {
            store: { type: "string", description: "Nom de l'enseigne, ex. Sephora" },
            price_eur: { type: "number", description: "Prix TTC en euros" },
            url: { type: "string", description: "URL de la page produit" },
            in_stock: { type: "boolean" },
            note: { type: "string", description: "Contenance, promo, teinte… (court)" },
          },
        },
      },
      summary: { type: "string", description: "Une phrase en français : où c'est le moins cher." },
    },
  },
};

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return Response.json({ error: "Clé API Anthropic manquante (ANTHROPIC_API_KEY dans .env.local)." }, { status: 503 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Requête invalide" }, { status: 400 });
  const { name, brand, code, quantity, city } = parsed.data;

  // Serve a recent search for the same product for free. City is left out of the key on purpose:
  // online prices are national, and sharing the entry across visitors is what makes the cache pay off.
  const cacheKey = `prices:v1:${code && /^\d{6,14}$/.test(code) ? code : [brand, name, quantity ?? ""].map(norm).join("|")}`;
  const cached = await kv.getJSON<LiveReport>(cacheKey).catch(() => null);
  if (cached) return Response.json(cached);

  const blocked = await guard(req, "live-prices");
  if (blocked) return blocked;

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Trouve le prix actuel de ce produit chez les revendeurs français en ligne :
Produit : ${name}
Marque : ${brand || "inconnue"}
${quantity ? `Contenance : ${quantity}\n` : ""}${code ? `Code-barres EAN : ${code}\n` : ""}
Cherche sur plusieurs enseignes (parfumeries, parapharmacies, grandes surfaces, Amazon.fr). Ne garde que les offres pour CE produit (même marque, même gamme ; signale si la contenance diffère). N'invente aucun prix : si tu ne trouves pas, renvoie une liste vide. Termine en appelant report_prices.`,
    },
  ];

  try {
    for (let turn = 0; turn < 4; turn++) {
      const response = await anthropic.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        ...FALLBACK,
        output_config: { effort: "medium" },
        tools: [
          {
            type: "web_search_20260209",
            name: "web_search",
            max_uses: 6,
            allowed_domains: PRICE_DOMAINS,
            user_location: { type: "approximate", country: "FR", ...(city ? { city } : {}) },
          },
          reportTool,
        ],
        messages,
      });
      await recordUsage(response.usage, "live-prices");

      if (response.stop_reason === "refusal") {
        return Response.json({ error: "La recherche de prix n'a pas pu aboutir." }, { status: 502 });
      }

      const call = response.content.find(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === "report_prices",
      );
      if (call && response.stop_reason !== "max_tokens") {
        const report = Report.safeParse(call.input);
        if (!report.success) return Response.json({ error: "Réponse illisible, réessayez." }, { status: 502 });
        const offers: PricePoint[] = report.data.offers
          .filter((o) => o.price_eur > 0 && /^https?:\/\//.test(o.url))
          .map((o) => ({
            price: o.price_eur,
            currency: "EUR",
            date: new Date().toISOString().slice(0, 10),
            store: o.store + (o.note ? ` · ${o.note}` : "") + (o.in_stock ? "" : " · rupture"),
            source: "web" as const,
            url: o.url,
          }))
          .sort((a, b) => a.price - b.price);
        const result: LiveReport = { offers, summary: report.data.summary, checkedAt: new Date().toISOString() };
        await kv.setJSON(cacheKey, result, offers.length ? CACHE_HIT_TTL : CACHE_MISS_TTL).catch((e) => console.error("live-prices cache", e));
        return Response.json(result);
      }

      // pause_turn (long server-side search) or a text-only turn: continue the conversation.
      messages.push({ role: "assistant", content: response.content });
      if (response.stop_reason !== "pause_turn") {
        messages.push({ role: "user", content: "Appelle maintenant report_prices avec ce que tu as trouvé." });
      }
    }
    return Response.json({ error: "Aucun prix trouvé pour le moment." }, { status: 504 });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Trop de demandes, réessayez dans une minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("live-prices", err.status, err.message);
      return Response.json({ error: "Service de prix indisponible." }, { status: 502 });
    }
    throw err;
  }
}
