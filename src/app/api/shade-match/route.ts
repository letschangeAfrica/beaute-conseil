import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropicErrorResponse, jsonError, parseBody, requireApiKey } from "@/lib/api-utils";
import { FALLBACK, MODEL, anthropic } from "@/lib/claude";
import { guard, overBudget, recordUsage, release } from "@/lib/guard";
import { kv } from "@/lib/kv";
import { SKIN_TONE_VALUES, UNDERTONE_VALUES } from "@/lib/types";
import { getProduct } from "@/lib/obf";
import { cleanText, fence, isSafeWebUrl, UNTRUSTED_RULE } from "@/lib/untrusted";
import { asBarcode } from "@/lib/utils";

export const maxDuration = 120;

/**
 * Suggests real shade names (e.g. "220 Natural Beige") from a complexion product's range,
 * for a given skin tone and undertone. Uses web search on the brand's and retailers' pages.
 * Results hold no personal data, so they are cached and shared for 14 days.
 */
const CACHE_TTL = 14 * 86_400;

const Body = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(100).default(""),
  code: z.string().max(20).optional(),
  skinTone: z.enum(SKIN_TONE_VALUES),
  undertone: z.enum(UNDERTONE_VALUES),
});

const Report = z.object({
  found: z.boolean(),
  shades: z.array(z.object({ name: z.string(), why: z.string() })).max(3),
  tip: z.string(),
  source_url: z.string(),
});

export interface ShadeMatch {
  found: boolean;
  shades: { name: string; why: string }[];
  tip: string;
  sourceUrl?: string;
  checkedAt: string;
}

const reportTool: Anthropic.Beta.BetaTool = {
  name: "report_shades",
  description: "Enregistre les teintes conseillées. À appeler UNE fois, à la fin, avec uniquement des noms de teintes réellement trouvés dans la gamme de ce produit.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["found", "shades", "tip", "source_url"],
    properties: {
      found: { type: "boolean", description: "false si la gamme de teintes de ce produit n'a pas été trouvée" },
      shades: {
        type: "array",
        description: "1 à 3 teintes, la plus probable en premier",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "why"],
          properties: {
            name: { type: "string", description: "Nom exact de la teinte, avec son numéro, ex. « 220 Natural Beige »" },
            why: { type: "string", description: "Une phrase simple en français" },
          },
        },
      },
      tip: { type: "string", description: "Un conseil court en français pour choisir entre ces teintes" },
      source_url: { type: "string", description: "Page où la gamme de teintes a été trouvée, ou chaîne vide" },
    },
  },
};

const TONE: Record<string, string> = {
  "tres-clair": "très claire",
  clair: "claire",
  moyen: "medium",
  mat: "mate",
  fonce: "foncée",
  "tres-fonce": "très foncée",
};
const UNDERTONE: Record<string, string> = { chaud: "chaud", froid: "froid", neutre: "neutre", olive: "olive", inconnu: "inconnu" };


export async function POST(req: Request) {
  const noKey = requireApiKey();
  if (noKey) return noKey;
  const parsed = await parseBody(req, Body);
  if (!parsed.ok) return parsed.response;
  const { code, skinTone, undertone } = parsed.data;

  // Trust the barcode, not the browser (see live-prices): a verified product's name and brand come from
  // Open Beauty Facts, and only verified products use the shared cache. v2 drops entries cached before this.
  const barcode = code ? asBarcode(code) : null;
  const known = barcode ? await getProduct(barcode).catch(() => null) : null;
  const { name, brand } = known ?? parsed.data;
  const cacheKey = known && barcode ? `shades:v2:${barcode}:${skinTone}:${undertone}` : null;
  const cached = cacheKey ? await kv.getJSON<ShadeMatch>(cacheKey).catch(() => null) : null;
  if (cached) return Response.json(cached);

  const blocked = await guard(req, "shade-match");
  if (blocked) return blocked;

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `Produit de teint :
${fence(known ? "open-beauty-facts" : "navigateur", JSON.stringify({ produit: cleanText(name, 200), marque: cleanText(brand, 100) || "inconnue", code_barres: barcode ?? undefined }))}
Carnation : ${TONE[skinTone]}. Sous-ton : ${UNDERTONE[undertone]}.

Trouve la gamme de teintes de CE produit (site de la marque ou revendeurs français), puis choisis les 1 à 3 teintes les plus proches de cette carnation et de ce sous-ton. Utilise les noms et numéros exacts de la gamme. Si tu ne trouves pas la gamme, mets found à false et une liste vide : n'invente aucune teinte. Termine en appelant report_shades.`,
    },
  ];

  try {
    for (let turn = 0; turn < 4; turn++) {
      // Audit M-6: stop between turns once the day's budget is spent (each extra turn re-sends the searches).
      if (turn > 0 && (await overBudget("shade-match"))) return jsonError("Belle a reçu beaucoup de demandes aujourd'hui. Cette fonction revient demain.", 503);
      const response = await anthropic.beta.messages.create({
        model: MODEL,
        // Audit M-6: the useful output is one small tool call; 6,000 leaves room for thinking (was 16,000).
        max_tokens: 6000,
        ...FALLBACK,
        output_config: { effort: "medium" },
        system: `Tu aides à choisir une teinte de maquillage dans la gamme réelle d'un produit.\n\n${UNTRUSTED_RULE}`,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4, user_location: { type: "approximate", country: "FR" } }, reportTool],
        messages,
      },
      // maxDuration is 120 s for up to 4 turns: keep each turn short instead of the SDK's 10-minute default.
      { timeout: 25_000, maxRetries: 1 },
      );
      await recordUsage(response, "shade-match");
      if (response.stop_reason === "refusal") return jsonError("La recherche de teinte n'a pas pu aboutir.", 502);

      const call = response.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === "report_shades");
      if (call && response.stop_reason !== "max_tokens") {
        const report = Report.safeParse(call.input);
        if (!report.success) return jsonError("Réponse illisible, réessayez.", 502);
        const r = report.data;
        // Checked in code: short texts, and a source link only if it is a plain https page.
        const shades = r.found ? r.shades.map((x) => ({ name: cleanText(x.name, 80), why: cleanText(x.why, 200) })).filter((x) => x.name) : [];
        const result: ShadeMatch = {
          found: shades.length > 0,
          shades,
          tip: cleanText(r.tip, 300),
          sourceUrl: isSafeWebUrl(r.source_url) ? r.source_url : undefined,
          checkedAt: new Date().toISOString(),
        };
        if (cacheKey) await kv.setJSON(cacheKey, result, CACHE_TTL).catch((e) => console.error("shade-match cache", e));
        return Response.json(result);
      }

      messages.push({ role: "assistant", content: response.content });
      if (response.stop_reason !== "pause_turn") messages.push({ role: "user", content: "Appelle maintenant report_shades avec ce que tu as trouvé." });
    }
    return jsonError("Teintes introuvables pour le moment.", 504);
  } catch (err) {
    return anthropicErrorResponse(err, "shade-match", "Service de teintes indisponible.");
  } finally {
    await release("shade-match"); // give back the budget reserved by guard() (audit M-5)
  }
}
