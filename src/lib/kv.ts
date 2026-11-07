import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Tiny key-value store used for rate limits, the daily spend counter and the live-price cache.
 *
 * - Production: Upstash Redis (Vercel → Storage → Upstash for Redis injects KV_REST_API_URL / KV_REST_API_TOKEN;
 *   a direct Upstash database gives UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). Shared by every server instance.
 * - Fallback: in-process memory. Fine for `npm run dev`, but on serverless each instance has its own memory,
 *   so limits are only approximate. Configure Redis before sharing the app.
 */
export interface KV {
  /** Increments a counter, setting its expiry when it is created. Returns the new value. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  incrByFloat(key: string, by: number, ttlSeconds: number): Promise<number>;
  getNumber(key: string): Promise<number>;
  /** Several counters in one round trip (missing keys read as 0). */
  getNumbers(keys: string[]): Promise<number[]>;
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

function redisKV(redis: Redis): KV {
  return {
    async incr(key, ttl) {
      const [n] = await redis.multi().incr(key).expire(key, ttl, "NX").exec<[number, number]>();
      return n;
    },
    async incrByFloat(key, by, ttl) {
      const [n] = await redis.multi().incrbyfloat(key, by).expire(key, ttl, "NX").exec<[number, number]>();
      return Number(n);
    },
    async getNumber(key) {
      return Number((await redis.get<number | string>(key)) ?? 0);
    },
    async getNumbers(keys) {
      if (!keys.length) return [];
      const values = await redis.mget<(number | string | null)[]>(...keys);
      return values.map((v) => Number(v ?? 0));
    },
    async getJSON<T>(key: string) {
      return (await redis.get<T>(key)) ?? null;
    },
    async setJSON(key, value, ttl) {
      await redis.set(key, value, { ex: ttl });
    },
    async del(key) {
      await redis.del(key);
    },
  };
}

function memoryKV(): KV {
  const store = new Map<string, { value: unknown; expires: number }>();
  const live = (key: string) => {
    const e = store.get(key);
    if (e && e.expires <= Date.now()) {
      store.delete(key);
      return undefined;
    }
    return e;
  };
  const add = (key: string, by: number, ttl: number) => {
    const e = live(key);
    const value = Number(e?.value ?? 0) + by;
    store.set(key, { value, expires: e?.expires ?? Date.now() + ttl * 1000 });
    return value;
  };
  return {
    async incr(key, ttl) {
      return add(key, 1, ttl);
    },
    async incrByFloat(key, by, ttl) {
      return add(key, by, ttl);
    },
    async getNumber(key) {
      return Number(live(key)?.value ?? 0);
    },
    async getNumbers(keys) {
      return keys.map((k) => Number(live(k)?.value ?? 0));
    },
    async getJSON<T>(key: string) {
      return (live(key)?.value as T) ?? null;
    },
    async setJSON(key, value, ttl) {
      store.set(key, { value, expires: Date.now() + ttl * 1000 });
    },
    async del(key) {
      store.delete(key);
    },
  };
}

function create(): KV {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return redisKV(new Redis({ url, token }));
  if (process.env.NODE_ENV === "production") {
    console.warn("[kv] No Redis configured: rate limits and spend cap are per-instance only. Set KV_REST_API_URL / KV_REST_API_TOKEN.");
  }
  return memoryKV();
}

// Survive hot reloads in dev so counters aren't reset on every file save.
const g = globalThis as typeof globalThis & { __belleKV?: KV };
export const kv: KV = (g.__belleKV ??= create());
