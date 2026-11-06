import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { hasApiKey } from "./claude";
import { PRICE_DOMAINS } from "./stores";

/**
 * Route-handler helpers shared by src/app/api/**. Server-only.
 * See audits/code-duplication-audit.md (F-03, F-04, F-05).
 */

export const API_MSG = {
  noApiKey: "Clé API Anthropic manquante (ANTHROPIC_API_KEY dans .env.local).",
  rateLimited: "Trop de demandes, réessayez dans une minute.",
  catalogDown: "La base produits ne répond pas, réessayez dans un instant.",
  invalid: "Requête invalide",
} as const;

export const jsonError = (error: string, status: number) => Response.json({ error }, { status });

/** Returns a 503 Response when no Anthropic credentials are configured, else null. */
export function requireApiKey(): Response | null {
  return hasApiKey() ? null : jsonError(API_MSG.noApiKey, 503);
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

/** `req.json()` + `schema.safeParse` + 400. Unlike the inline version, malformed JSON is a 400, not a 500. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S, invalidMsg: string = API_MSG.invalid): Promise<Parsed<z.output<S>>> {
  const raw: unknown = await req.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, response: jsonError(invalidMsg, 400) };
}

/** Maps Anthropic SDK errors to JSON responses; rethrows anything else. */
export function anthropicErrorResponse(err: unknown, label: string, unavailableMsg: string): Response {
  if (err instanceof Anthropic.RateLimitError) return jsonError(API_MSG.rateLimited, 429);
  if (err instanceof Anthropic.APIError) {
    console.error(label, err.status, err.message);
    return jsonError(unavailableMsg, 502);
  }
  throw err;
}

/** Wraps a catalog (Open Beauty Facts) call: logs and returns 502 on failure. */
export async function withCatalog(label: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    console.error(label, err);
    return jsonError(API_MSG.catalogDown, 502);
  }
}

/** Server-side web search restricted to French retailers (was inlined in chat + live-prices). */
export function priceWebSearchTool(maxUses: number, city?: string): Anthropic.Beta.BetaWebSearchTool20260209 {
  return {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: maxUses,
    allowed_domains: PRICE_DOMAINS,
    user_location: { type: "approximate", country: "FR", ...(city ? { city } : {}) },
  };
}
