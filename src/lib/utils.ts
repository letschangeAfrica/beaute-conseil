/**
 * Shared, framework-free helpers — safe to import from client components
 * AND server code (no "server-only", no React, no SDKs).
 *
 * Each helper replaces code that is currently duplicated across the app.
 * See audits/code-duplication-audit.md for the call sites to migrate.
 */
import type { Reason, ScoredProduct } from "./types";

/* ---------- Errors ------------------------------------------------------ */

/** User-facing fallback message (was hard-coded 7× in 4 pages). */
export const GENERIC_ERROR = "Une erreur est survenue.";

/** `e instanceof Error ? e.message : "Une erreur…"`, but also guards against empty messages. */
export function errorMessage(e: unknown, fallback = GENERIC_ERROR): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/* ---------- HTTP (browser → our API routes) ----------------------------- */

/** RequestInit for a JSON POST (was inlined 5× in 4 pages). */
export function jsonPost(body: unknown, signal?: AbortSignal): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal };
}

/** Extracts `{ error }` from a failed API response; tolerates non-JSON bodies. */
export async function responseError(res: Response): Promise<string> {
  const json: unknown = await res.json().catch(() => null);
  const msg = json && typeof json === "object" && "error" in json ? (json as { error: unknown }).error : null;
  return typeof msg === "string" && msg ? msg : GENERIC_ERROR;
}

/** POST JSON and return the parsed response, or throw `Error(apiError)`. */
export async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, jsonPost(body, signal));
  if (!res.ok) throw new Error(await responseError(res));
  return (await res.json()) as T;
}

/* ---------- Routes ------------------------------------------------------ */

export const MIN_QUERY_LENGTH = 2;
export const searchHref = (q: string) => `/recherche?q=${encodeURIComponent(q)}`;
export const productHref = (code: string) => `/produit/${code}`;

/* ---------- Barcodes ---------------------------------------------------- */

/** The one barcode rule for the whole app: a GTIN/EAN of 8 to 14 digits (EAN-8, UPC-A, EAN-13, GTIN-14). */
const BARCODE_RE = /^\d{8,14}$/;

declare const BarcodeBrand: unique symbol;
/** A validated barcode. Only asBarcode() / parseBarcode() can produce one (branded type, zero runtime cost). */
export type Barcode = string & { readonly [BarcodeBrand]: true };

/** Strict: for codes from URLs and APIs, which must already be digits only. */
export const asBarcode = (s: string): Barcode | null => (BARCODE_RE.test(s) ? (s as Barcode) : null);

/** Lenient: for typed or scanned input, drops spaces, dashes and other separators first. */
export const parseBarcode = (input: string): Barcode | null => asBarcode(input.replace(/\D/g, ""));

/* ---------- Formatting -------------------------------------------------- */

const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
/** "12,50 €" — single formatter for UI and scoring reasons. */
export const formatEUR = (n: number) => EUR.format(n);
export const formatDateFR = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

/* ---------- Sorting / lists --------------------------------------------- */

export const byPriceAsc = (a: { price: number }, b: { price: number }) => a.price - b.price;
export const byScoreDesc = (a: { score: number }, b: { score: number }) => b.score - a.score;

/** Add `item` if absent, remove it if present. */
export function toggleIn<T>(
  list: readonly T[],
  item: T,
  { same = Object.is as (a: T, b: T) => boolean, at = "end" as "start" | "end" } = {},
): T[] {
  if (list.some((x) => same(x, item))) return list.filter((x) => !same(x, item));
  return at === "start" ? [item, ...list] : [...list, item];
}

/* ---------- Product / scoring projections ------------------------------- */

/** The subset of a scored product that cards, favourites and the chat stream need. */
export type ProductSummary = Pick<ScoredProduct, "code" | "name" | "brand" | "image" | "score" | "verdict">;

export function toSummary({ code, name, brand, image, score, verdict }: ProductSummary): ProductSummary {
  return { code, name, brand, image, score, verdict };
}

/** Headline reason for a card: a warning if the score is poor, else the best plus, else anything. */
export function topReason(p: Pick<ScoredProduct, "reasons" | "score">): string | undefined {
  return (
    p.reasons.find((r) => r.kind === "minus" && p.score < 50) ??
    p.reasons.find((r) => r.kind === "plus") ??
    p.reasons[0]
  )?.text;
}

export function reasonsByKind(reasons: readonly Reason[]): Record<Reason["kind"], Reason[]> {
  const out: Record<Reason["kind"], Reason[]> = { plus: [], minus: [], info: [] };
  for (const r of reasons) out[r.kind].push(r);
  return out;
}
