import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => null }));

const { clientIp, guard, rateLimit, release, spentToday } = await import("./guard");
const { kv } = await import("./kv");

const spendKey = () => `spend:${new Date().toISOString().slice(0, 10)}`;
const req = (headers: Record<string, string> = {}) => new Request("http://test/api", { method: "POST", headers });

describe("clientIp (audit M-4)", () => {
  const spoofed = req({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8, 9.9.9.9" });

  it("ignores forwarding headers when no trusted proxy sets them (self-hosting)", () => {
    expect(clientIp(spoofed, {})).toBe("unknown");
  });

  it("trusts them behind Vercel or a declared proxy", () => {
    expect(clientIp(spoofed, { VERCEL: "1" })).toBe("1.2.3.4");
    expect(clientIp(req({ "x-forwarded-for": "5.6.7.8, 9.9.9.9" }), { TRUST_PROXY: "1" })).toBe("5.6.7.8");
  });

  it("never turns arbitrary header text into an identity", () => {
    expect(clientIp(req({ "x-real-ip": "x".repeat(8_000) }), { VERCEL: "1" })).toBe("unknown");
    expect(clientIp(req({ "x-real-ip": "1.2.3.4:evil" }), { VERCEL: "1" })).toBe("unknown");
    expect(clientIp(req({ "x-real-ip": "2001:db8::1" }), { VERCEL: "1" })).toBe("2001:db8::1");
  });
});

describe("daily budget is reserved atomically (audit M-5)", () => {
  // The eval header skips the per-visitor limits (all test requests share one identity) but never the budget,
  // so these tests measure the reservation alone.
  const TOKEN = "test-eval-token-0123456789";
  const evalReq = () => req({ "x-belle-eval": TOKEN });
  beforeEach(async () => {
    vi.stubEnv("DAILY_BUDGET_USD", "5");
    vi.stubEnv("EVAL_TOKEN", TOKEN);
    await kv.del(spendKey());
  });
  afterEach(() => vi.unstubAllEnvs());

  it("the audit's proof of concept: at $4.99 of $5, 20 simultaneous requests no longer all pass", async () => {
    await kv.incrByFloat(spendKey(), 4.99, 60);
    const results = await Promise.all(Array.from({ length: 20 }, () => guard(evalReq(), "shade")));
    expect(results.filter((r) => r === null)).toHaveLength(0); // $4.99 + $0.10 > $5
    expect(await spentToday()).toBeCloseTo(4.99); // refused reservations are given back
  });

  it("concurrent requests see each other: only what fits in the budget passes", async () => {
    await kv.incrByFloat(spendKey(), 4.5, 60);
    const results = await Promise.all(Array.from({ length: 20 }, () => guard(evalReq(), "shade")));
    expect(results.filter((r) => r === null)).toHaveLength(5); // 5 × $0.10 = $0.50
  });

  it("release() gives the reservation back once the request is over", async () => {
    expect(await guard(evalReq(), "chat")).toBeNull();
    expect(await spentToday()).toBeCloseTo(0.6);
    await release("chat");
    expect(await spentToday()).toBeCloseTo(0);
  });
});

describe("catalog rate limit (audit M-7)", () => {
  it("allows normal browsing, then asks to wait a minute", async () => {
    const r = () => rateLimit(req(), "catalog");
    const results = [];
    for (let i = 0; i < 31; i++) results.push(await r());
    expect(results.slice(0, 30).every((x) => x === null)).toBe(true);
    expect(results[30]?.status).toBe(429);
  });
});

describe("per-turn budget check excludes the request's own reservation (M-5 + M-6)", () => {
  const TOKEN = "test-eval-token-0123456789";
  beforeEach(async () => {
    vi.stubEnv("DAILY_BUDGET_USD", "5");
    vi.stubEnv("EVAL_TOKEN", TOKEN);
    await kv.del(spendKey());
  });
  afterEach(() => vi.unstubAllEnvs());

  it("a request that reserved the last of the budget is not stopped by its own reservation", async () => {
    const { overBudget } = await import("./guard");
    await kv.incrByFloat(spendKey(), 4.4, 60);
    expect(await guard(req({ "x-belle-eval": TOKEN }), "live-prices")).toBeNull(); // 4.4 + 0.6 = 5.0
    expect(await overBudget()).toBe(true); // nobody else may start
    expect(await overBudget("live-prices")).toBe(false); // but this request may finish its turns
  });
});
