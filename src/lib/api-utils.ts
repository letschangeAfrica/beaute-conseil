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
  // The env-var hint helps while developing; visitors of a deployed site just get a neutral message.
  noApiKey:
    process.env.NODE_ENV === "development"
      ? "Clé API Anthropic manquante (ANTHROPIC_API_KEY dans .env.local)."
      : "Cette fonction n'est pas disponible pour le moment.",
  rateLimited: "Trop de demandes, réessayez dans une minute.",
  catalogDown: "La base produits ne répond pas, réessayez dans un instant.",
  invalid: "Requête invalide",
  unexpected: "Une erreur inattendue est survenue. Réessayez dans un instant.",
} as const;

export const jsonError = (error: string, status: number, headers?: HeadersInit) => Response.json({ error }, { status, headers });

/** Returns a 503 Response when no Anthropic credentials are configured, else null. */
export function requireApiKey(): Response | null {
  return hasApiKey() ? null : jsonError(API_MSG.noApiKey, 503);
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

/**
 * `req.json()` + `schema.safeParse` + 400. Malformed JSON is a 400, not a 500.
 * `invalidMsg` can be a function of the validation error, to name the field that failed.
 */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
  invalidMsg: string | ((error: z.ZodError) => string) = API_MSG.invalid,
): Promise<Parsed<z.output<S>>> {
  const raw: unknown = await req.json().catch(() => undefined);
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const message = typeof invalidMsg === "function" ? invalidMsg(parsed.error) : invalidMsg;
  return { ok: false, response: jsonError(message, 400) };
}

/**
 * Maps any error from a route to a JSON Response. Never throws, so a route can't fall through to a
 * raw, body-less 500 (e.g. the SDK throws a plain AnthropicError when structured output fails to parse).
 * Full details go to the server log only.
 */
export function anthropicErrorResponse(err: unknown, label: string, unavailableMsg: string): Response {
  if (err instanceof Anthropic.RateLimitError) {
    const retryAfter = err.headers?.get("retry-after");
    return jsonError(API_MSG.rateLimited, 429, retryAfter ? { "Retry-After": retryAfter } : undefined);
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`[${label}] Anthropic ${err.status ?? "network"} request-id=${err.requestID ?? "-"}: ${err.message}`);
    return jsonError(unavailableMsg, 502);
  }
  console.error(`[${label}] unexpected`, err);
  return jsonError(API_MSG.unexpected, 500);
}

/** Wraps a catalog (Open Beauty Facts) call: logs and returns 502 on failure. */
export async function withCatalog(label: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[${label}]`, err);
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
