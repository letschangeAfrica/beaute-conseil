import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

// These modules are server-only and pull in Auth.js; neither matters for the logic under test.
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: async () => null }));

const { anthropicErrorResponse, parseBody } = await import("./api-utils");
const { costOf } = await import("./guard");

describe("anthropicErrorResponse: every error becomes a JSON response (never a raw 500)", () => {
  const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {});

  it("rate limit → 429 and forwards Anthropic's Retry-After", async () => {
    const err = new Anthropic.RateLimitError(429, undefined, "rate limited", new Headers({ "retry-after": "12" }));
    const res = anthropicErrorResponse(err, "test", "Service indisponible.");
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("12");
    expect(await res.json()).toEqual({ error: "Trop de demandes, réessayez dans une minute." });
  });

  it("API error → 502 with the route's message, request-id in the log only", async () => {
    const log = quiet();
    const err = new Anthropic.InternalServerError(500, undefined, "overloaded", new Headers({ "request-id": "req_123" }));
    const res = anthropicErrorResponse(err, "test", "Service d'analyse indisponible.");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Service d'analyse indisponible." });
    expect(String(log.mock.calls[0][0])).toContain("request-id=req_123");
    log.mockRestore();
  });

  it("structured-output parse failure (plain AnthropicError) → 500 JSON, details not exposed", async () => {
    const log = quiet();
    const res = anthropicErrorResponse(new Anthropic.AnthropicError("Failed to parse structured output: …"), "shade", "x");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/inattendue/);
    expect(JSON.stringify(body)).not.toContain("parse");
    log.mockRestore();
  });
});

describe("parseBody: the message can name the field that failed", () => {
  const Shade = z.object({ image: z.string(), consent: z.literal(true) });
  const msg = (e: z.ZodError) => (e.issues.some((i) => i.path[0] === "consent") ? "Consentement requis" : "Image invalide");
  const req = (body: unknown) => new Request("http://test/api", { method: "POST", body: JSON.stringify(body) });

  it("missing consent → consent message", async () => {
    const r = await parseBody(req({ image: "x", consent: false }), Shade, msg);
    expect(!r.ok && (await r.response.json())).toEqual({ error: "Consentement requis" });
  });

  it("bad image → image message", async () => {
    const r = await parseBody(req({ image: 1, consent: true }), Shade, msg);
    expect(!r.ok && (await r.response.json())).toEqual({ error: "Image invalide" });
  });
});

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
