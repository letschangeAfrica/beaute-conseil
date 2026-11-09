import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropicErrorResponse, parseBody, requireApiKey } from "@/lib/api-utils";
import { FALLBACK, MODEL, anthropic } from "@/lib/claude";
import { guard, overBudget, recordUsage, release } from "@/lib/guard";
import { kv } from "@/lib/kv";
import { PRICE_DOMAINS } from "@/lib/stores";
import type { PricePoint } from "@/lib/types";
import { getProduct } from "@/lib/obf";
import { cleanText, fence, isAllowedUrl, UNTRUSTED_RULE } from "@/lib/untrusted";
import { asBarcode } from "@/lib/utils";

export const maxDuration = 120;

/** How long a price search is reused: 6 h when offers were found, 1 h when none were (retry sooner). */
const CACHE_HIT_TTL = 6 * 3600;
const CACHE_MISS_TTL = 3600;

interface LiveReport {
  offers: PricePoint[];
  summary: string;
  checkedAt: string;
}


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
  const noKey = requireApiKey();
  if (noKey) return noKey;
  const parsed = await parseBody(req, Body);
  if (!parsed.ok) return parsed.response;
  const { code, city } = parsed.data;

  // Trust the barcode, not the browser: when Open Beauty Facts knows the code, its name, brand and size
  // replace what the page sent. Otherwise anyone could pair a real barcode with a crafted "name" and
  // poison the shared cache that every visitor reads.
  const barcode = code ? asBarcode(code) : null;
  const known = barcode ? await getProduct(barcode).catch(() => null) : null;
  const product = known ? { name: known.name, brand: known.brand, quantity: known.quantity } : parsed.data;

  // Shared cache (free for everyone) only for verified products. City is left out of the key on purpose:
  // online prices are national. v2: entries written before this check are never read again.
  const cacheKey = known && barcode ? `prices:v2:${barcode}` : null;
  const cached = cacheKey
    ? await kv.getJSON<LiveReport>(cacheKey).catch((e) => {
        console.warn("[live-prices] cache read", e); // degrade to a live search
        return null;
      })
    : null;
  if (cached) return Response.json(cached);

  const blocked = await guard(req, "live-prices");
  if (blocked) return blocked;

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Trouve le prix actuel de ce produit chez les revendeurs français en ligne. Ses informations :
${fence(
  known ? "open-beauty-facts" : "navigateur",
  JSON.stringify({
    produit: cleanText(product.name, 200),
    marque: cleanText(product.brand, 100) || "inconnue",
    contenance: cleanText(product.quantity, 50) || undefined,
    code_barres: barcode ?? undefined,
  }),
)}
Cherche sur plusieurs enseignes (parfumeries, parapharmacies, grandes surfaces, Amazon.fr). Ne garde que les offres pour CE produit (même marque, même gamme ; signale si la contenance diffère). N'invente aucun prix : si tu ne trouves pas, renvoie une liste vide. Termine en appelant report_prices.`,
    },
  ];

  try {
    for (let turn = 0; turn < 4; turn++) {
      // Audit M-6: stop between turns once the day's budget is spent (each extra turn re-sends the searches).
      if (turn > 0 && (await overBudget("live-prices"))) return Response.json({ error: "Belle a reçu beaucoup de demandes aujourd'hui. Cette fonction revient demain." }, { status: 503 });
      const response = await anthropic.beta.messages.create(
        {
          model: MODEL,
          // Audit M-6: the useful output is one small tool call; 6,000 leaves room for thinking (was 16,000).
          max_tokens: 6000,
          ...FALLBACK,
          output_config: { effort: "medium" },
          system: `Tu compares les prix d'un produit de beauté chez les revendeurs français en ligne.\n\n${UNTRUSTED_RULE}`,
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
        },
        // maxDuration is 120 s for up to 4 turns: keep each turn short instead of the SDK's 10-minute default.
        { timeout: 25_000, maxRetries: 1 },
      );
      await recordUsage(response, "live-prices");

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
          // Checked in code, whatever the model says: links only to the retailers searched, a sane price, short texts.
          .filter((o) => o.price_eur > 0 && o.price_eur < 2000 && isAllowedUrl(o.url, PRICE_DOMAINS))
          .map((o) => {
            const note = cleanText(o.note, 80);
            return {
              price: o.price_eur,
              currency: "EUR",
              date: new Date().toISOString().slice(0, 10),
              store: cleanText(o.store, 60) + (note ? ` · ${note}` : "") + (o.in_stock ? "" : " · rupture"),
              source: "web" as const,
              url: o.url,
            };
          })
          .sort((a, b) => a.price - b.price);
        const result: LiveReport = { offers, summary: cleanText(report.data.summary, 300), checkedAt: new Date().toISOString() };
        if (cacheKey) await kv.setJSON(cacheKey, result, offers.length ? CACHE_HIT_TTL : CACHE_MISS_TTL).catch((e) => console.error("[live-prices] cache write", e));
        return Response.json(result);
      }

      // pause_turn (long server-side search) or a text-only turn: continue the conversation.
      messages.push({ role: "assistant", content: response.content });
      if (response.stop_reason !== "pause_turn") {
        messages.push({ role: "user", content: "Appelle maintenant report_prices avec ce que tu as trouvé." });
      }
    }
    // The model never called report_prices: an upstream failure (502), not a gateway timeout (504).
    return Response.json({ error: "Aucun prix trouvé pour le moment." }, { status: 502 });
  } catch (err) {
    return anthropicErrorResponse(err, "live-prices", "Service de prix indisponible.");
  } finally {
    await release("live-prices"); // give back the budget reserved by guard() (audit M-5)
  }
}
