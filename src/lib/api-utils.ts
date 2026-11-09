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
/**
 * Body size caps per route, sized from the real maximum each one can legitimately receive:
 * chat history is capped at 24,000 characters (up to 3 bytes each in UTF-8, plus the profile);
 * account sync carries the profile and up to 300 favourites; photos are resized in the browser
 * (selfie 1024 px, label 1800 px) and sent as base64.
 */
export const BODY_LIMITS = { default: 32_000, chat: 128_000, sync: 256_000, image: 6_000_000 } as const;

/** Reads at most `maxBytes` of the body, without trusting Content-Length. Null when too large. */
async function readLimited(req: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(req.headers.get("content-length"));
  if (declared > maxBytes) return null;
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
  invalidMsg: string | ((error: z.ZodError) => string) = API_MSG.invalid,
  { maxBytes = BODY_LIMITS.default }: { maxBytes?: number } = {},
): Promise<Parsed<z.output<S>>> {
  // Audit M-3. JSON only: a text/plain "simple" request from another website could otherwise reach the
  // paid routes with a visitor's browser and identity (CSRF). Browsers also say where a request comes
  // from (Sec-Fetch-Site): refuse cross-site. And never buffer more than the route can legitimately need.
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return { ok: false, response: jsonError(API_MSG.invalid, 415) };
  if (req.headers.get("sec-fetch-site") === "cross-site") return { ok: false, response: jsonError("Requête refusée.", 403) };
  const text = await readLimited(req, maxBytes);
  if (text === null) return { ok: false, response: jsonError("Requête trop volumineuse.", 413) };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = undefined;
  }
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
