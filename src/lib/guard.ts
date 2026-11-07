import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { kv } from "./kv";

/**
 * Protects the paid Claude endpoints (chat, live-prices, shade):
 * 1. Per-visitor rate limits (signed-in users by account, everyone else by IP).
 * 2. A global daily spend cap in USD, fed by the real token usage of each response.
 */

/* ---------- Limits (edit here) ---------------------------------------- */

export const FEATURES = ["chat", "live-prices", "shade", "ingredients", "shade-match"] as const;
export type Feature = (typeof FEATURES)[number];

/** Requests allowed per visitor. Signed-in users get the higher numbers. */
const LIMITS: Record<Feature, { perHour: [anon: number, user: number]; perDay: [anon: number, user: number] }> = {
  // Anonymous is the cheapest identity to fake (an IP), so it gets the smallest share of the daily budget (audit S-01).
  chat: { perHour: [5, 30], perDay: [12, 100] },
  "live-prices": { perHour: [5, 15], perDay: [15, 50] }, // cache hits don't count
  shade: { perHour: [3, 6], perDay: [5, 15] },
  ingredients: { perHour: [5, 15], perDay: [10, 40] },
  "shade-match": { perHour: [4, 12], perDay: [10, 30] }, // cache hits don't count
};

/** Total estimated Claude spend allowed per UTC day, across all visitors. Override with DAILY_BUDGET_USD. */
export function dailyBudget(): number {
  const v = Number(process.env.DAILY_BUDGET_USD);
  return Number.isFinite(v) && v > 0 ? v : 5;
}

/* ---------- Pricing: list prices, USD per million tokens ----------------- */

type Pricing = { input: number; output: number; cacheWrite: number; cacheRead: number; perWebSearch: number };

/** Add an entry when MODEL (lib/claude.ts) changes or a fallback model shows up in the logs. */
const PRICING: Record<string, Pricing> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2, perWebSearch: 0.01 },
};
/** Used for any model not listed: over-estimating keeps the daily cap safe. */
const MOST_EXPENSIVE = PRICING["claude-opus-5-5"];

/** Estimated cost of one response, priced by the model that actually answered (it may be the refusal fallback). */
export function costOf(u: Anthropic.Beta.BetaUsage, model: string): number {
  const p = PRICING[model] ?? MOST_EXPENSIVE;
  return (
    (u.input_tokens * p.input +
      u.output_tokens * p.output +
      (u.cache_creation_input_tokens ?? 0) * p.cacheWrite +
      (u.cache_read_input_tokens ?? 0) * p.cacheRead) /
      1_000_000 +
    (u.server_tool_use?.web_search_requests ?? 0) * p.perWebSearch
  );
}

/* ---------- Identity -------------------------------------------------- */

async function identify(req: Request): Promise<{ id: string; signedIn: boolean }> {
  try {
    const session = await auth();
    const key = session?.user?.email ?? session?.user?.id;
    if (key) return { id: `u:${key.toLowerCase()}`, signedIn: true };
  } catch {
    /* auth not configured: fall back to IP */
  }
  // On Vercel these headers are set by the platform. When self-hosting, put a trusted proxy in front.
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return { id: `ip:${ip}`, signedIn: false };
}

/* ---------- Public API ------------------------------------------------ */

const today = () => new Date().toISOString().slice(0, 10);
const spendKey = () => `spend:${today()}`;
const DAY = 86_400;
const HOUR = 3_600;

const json = (error: string, status: number, headers?: HeadersInit) => Response.json({ error }, { status, headers });

/**
 * Call at the top of a paid route. Returns a Response to send back (429 / 503) when the request must be
 * refused, or null to continue. Counts the request against the visitor's limits.
 */
export async function guard(req: Request, feature: Feature): Promise<Response | null> {
  try {
    if (await overBudget()) {
      await countStat(feature, "blocked");
      return json("Belle a reçu beaucoup de demandes aujourd'hui. Cette fonction revient demain.", 503);
    }
    const { id, signedIn } = await identify(req);
    const l = LIMITS[feature];
    const i = signedIn ? 1 : 0;
    const hourWindow = Math.floor(Date.now() / (HOUR * 1000));
    const [hour, day] = await Promise.all([
      kv.incr(`rl:${feature}:${id}:h:${hourWindow}`, HOUR),
      kv.incr(`rl:${feature}:${id}:d:${today()}`, DAY),
    ]);
    if (hour > l.perHour[i] || day > l.perDay[i]) {
      await countStat(feature, "blocked");
      const retry = day > l.perDay[i] ? "demain" : "dans une heure";
      const hint = signedIn ? "" : " Connectez-vous pour en avoir davantage.";
      const retryAfter = day > l.perDay[i] ? DAY : HOUR - (Math.floor(Date.now() / 1000) % HOUR);
      return json(`Vous avez atteint la limite pour le moment, réessayez ${retry}.${hint}`, 429, { "Retry-After": String(retryAfter) });
    }
    return null;
  } catch (err) {
    // Store unreachable: fail closed, since an open endpoint costs money.
    console.error("[guard]", err);
    return json("Service momentanément indisponible, réessayez dans un instant.", 503);
  }
}

/** True once today's estimated spend has reached the daily budget. */
export async function overBudget(): Promise<boolean> {
  return (await kv.getNumber(spendKey())) >= dailyBudget();
}

/** Adds a response's estimated cost to today's total. Pass the whole message (it carries `usage` and `model`). Never throws. */
export async function recordUsage(
  message: Pick<Anthropic.Beta.BetaMessage, "usage" | "model"> | null | undefined,
  label: string,
): Promise<void> {
  if (!message?.usage) return;
  try {
    const cost = costOf(message.usage, message.model);
    const total = await kv.incrByFloat(spendKey(), cost, 2 * DAY);
    // Labels may carry a note after the feature name ("chat (client left)"): the cost still counts for the feature.
    const feature = label.split(" ")[0];
    if (isFeature(feature)) await Promise.all([countStat(feature, "calls"), kv.incrByFloat(statKey(today(), feature, "usd"), cost, STATS_TTL)]);
    if (total >= dailyBudget()) console.warn(`[budget] daily cap of $${dailyBudget()} reached (last call: ${label})`);
  } catch (err) {
    console.error("[budget] recordUsage", err);
  }
}

/* ---------- Usage statistics (for the private dashboard /admin/couts) ---------- */

/** Kept 40 days. calls = Claude API calls (a chat answer can make several); blocked = refused by the limits or the budget. */
const STATS_TTL = 40 * DAY;
export type StatMetric = "usd" | "calls" | "blocked";
export const statKey = (day: string, feature: Feature, metric: StatMetric) => `stats:v1:${day}:${feature}:${metric}`;
const isFeature = (s: string): s is Feature => (FEATURES as readonly string[]).includes(s);

async function countStat(feature: Feature, metric: "calls" | "blocked") {
  try {
    await kv.incr(statKey(today(), feature, metric), STATS_TTL);
  } catch {
    /* statistics never block a request */
  }
}

export interface DayStats {
  day: string;
  byFeature: Record<Feature, { usd: number; calls: number; blocked: number }>;
}

/** The last `days` days (oldest first), read in one round trip. */
export async function readStats(days: number, now = new Date()): Promise<DayStats[]> {
  const dayList = Array.from({ length: days }, (_, i) => new Date(now.getTime() - (days - 1 - i) * DAY * 1000).toISOString().slice(0, 10));
  const metrics: StatMetric[] = ["usd", "calls", "blocked"];
  const keys = dayList.flatMap((d) => FEATURES.flatMap((f) => metrics.map((m) => statKey(d, f, m))));
  const values = await kv.getNumbers(keys);
  let i = 0;
  return dayList.map((day) => {
    const byFeature = {} as DayStats["byFeature"];
    for (const f of FEATURES) byFeature[f] = { usd: values[i++], calls: values[i++], blocked: values[i++] };
    return { day, byFeature };
  });
}

/** Estimated spend so far today (the number the daily cap uses). */
export const spentToday = () => kv.getNumber(spendKey());
