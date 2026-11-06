import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

// These modules are server-only and pull in Auth.js; neither matters for the logic under test.
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => null }));

const { parseBody } = await import("./api-utils");
const { costOf } = await import("./guard");

const post = (body: string) => new Request("http://test/api", { method: "POST", body, headers: { "Content-Type": "application/json" } });
const Body = z.object({ q: z.string().min(2) });

describe("parseBody: malformed input is a 400, never a 500", () => {
  it("returns the parsed data for a valid body", async () => {
    const r = await parseBody(post(JSON.stringify({ q: "mascara" })), Body);
    expect(r).toEqual({ ok: true, data: { q: "mascara" } });
  });

  it.each([
    ["malformed JSON", "{not json"],
    ["empty body", ""],
    ["wrong shape", JSON.stringify({ q: 1 })],
  ])("rejects %s with 400 and the given message", async (_, raw) => {
    const r = await parseBody(post(raw), Body, "Recherche invalide");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.response.status).toBe(400);
    expect(await r.response.json()).toEqual({ error: "Recherche invalide" });
  });
});

describe("costOf: priced by the model that actually answered", () => {
  const usage = {
    input_tokens: 1_000_000,
    output_tokens: 100_000,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    server_tool_use: { web_search_requests: 2 },
  } as Parameters<typeof costOf>[0];

  it("uses the listed model's prices", () => {
    // 1M input × $4 + 0.1M output × $20 + 2 searches × $0.01
    expect(costOf(usage, "claude-opus-5-5")).toBeCloseTo(6.02, 6);
  });

  it("falls back to the most expensive known prices for an unknown model (never under-estimates)", () => {
    expect(costOf(usage, "some-fallback-model")).toBeCloseTo(costOf(usage, "claude-opus-5-5"), 6);
  });
});
