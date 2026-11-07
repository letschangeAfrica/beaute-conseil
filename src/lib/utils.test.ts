import { afterEach, describe, expect, it, vi } from "vitest";
import { CHAT_LIMITS, GENERIC_ERROR, NETWORK_ERROR, asBarcode, errorMessage, fitChatHistory, parseBarcode, postJson } from "./utils";

describe("errorMessage: users never see browser, parser or programming internals", () => {
  it.each(["Failed to fetch", "NetworkError when attempting to fetch resource.", "Load failed"])(
    "network failure %j (Chrome / Firefox / Safari) → network message",
    (m) => expect(errorMessage(new TypeError(m))).toBe(NETWORK_ERROR),
  );

  it.each([
    ["non-JSON reply", new SyntaxError(`Unexpected token '<', "<html>504</html>" is not valid JSON`)],
    ["empty 500 body", new SyntaxError("Unexpected end of JSON input")],
    ["programming bug", new TypeError("Cannot read properties of undefined (reading 'offers')")],
    ["browser API failure", new DOMException("The source image could not be decoded.", "InvalidStateError")],
    ["empty message", new Error("")],
    ["not an Error", "boom"],
  ])("%s → generic French message", (_, e) => {
    expect(errorMessage(e)).toBe(GENERIC_ERROR);
  });

  it("passes our API's own message through", () => {
    expect(errorMessage(new Error("Produit introuvable dans la base."))).toBe("Produit introuvable dans la base.");
  });
});

describe("postJson: status before body, French errors only", () => {
  afterEach(() => vi.unstubAllGlobals());
  const reply = (body: string, status: number) => vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));

  it("returns the parsed JSON on success", async () => {
    reply(JSON.stringify({ results: [1] }), 200);
    await expect(postJson("/api/x", {})).resolves.toEqual({ results: [1] });
  });

  it("surfaces the API's error message", async () => {
    reply(JSON.stringify({ error: "Recherche invalide" }), 400);
    await expect(postJson("/api/x", {})).rejects.toThrow("Recherche invalide");
  });

  it.each([
    ["HTML platform timeout page", "<html>504 Gateway Timeout</html>", 504],
    ["empty 500 body", "", 500],
    ["JSON without an error field", "{}", 502],
  ])("%s → generic message, not a parser error", async (_, body, status) => {
    reply(body, status);
    const err = await postJson("/api/x", {}).catch((e: unknown) => e);
    expect(errorMessage(err)).toBe(GENERIC_ERROR);
  });

  it("network failure → network message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const err = await postJson("/api/x", {}).catch((e: unknown) => e);
    expect(errorMessage(err)).toBe(NETWORK_ERROR);
  });
});

describe("barcode rule (one rule for scanner, server and price cache)", () => {
  it.each([
    ["EAN-8", "96385074"],
    ["UPC-A", "036000291452"],
    ["EAN-13", "3600530171910"],
    ["GTIN-14", "13600530171917"],
  ])("accepts %s", (_, code) => {
    expect(asBarcode(code)).toBe(code);
  });

  it.each(["", "123456", "1234567", "123456789012345", "36005301719a0", " 3600530171910"])("strictly rejects %j", (code) => {
    expect(asBarcode(code)).toBeNull();
  });

  it("parseBarcode drops separators from typed input", () => {
    expect(parseBarcode(" 3600-5301 71910 ")).toBe("3600530171910");
  });

  it("parseBarcode still enforces the length rule", () => {
    expect(parseBarcode("12-34-56")).toBeNull(); // 6 digits: was accepted by the server before
    expect(parseBarcode("1".repeat(15))).toBeNull(); // 15 digits: was accepted by manual entry before
  });
});

describe("fitChatHistory: what the advisor page sends stays within the API's cost caps (audit S-01)", () => {
  const turn = (role: "user" | "assistant", n: number, ch = "a") => ({ role, content: ch.repeat(n) });
  const total = (ts: { content: string }[]) => ts.reduce((n, t) => n + t.content.length, 0);

  it("keeps a short conversation unchanged", () => {
    const h = [turn("user", 10), turn("assistant", 20), turn("user", 5)];
    expect(fitChatHistory(h)).toEqual(h);
  });

  it("drops the oldest turns first to fit the total character budget", () => {
    const h = Array.from({ length: 12 }, (_, i) => turn(i % 2 ? "assistant" : "user", 3_000, String(i % 10)));
    const out = fitChatHistory(h);
    expect(total(out)).toBeLessThanOrEqual(CHAT_LIMITS.maxHistoryChars);
    expect(out.at(-1)).toEqual(h.at(-1)); // the latest turn is always there
    expect(out[0].role).toBe("user");
  });

  it("caps the number of messages and the size of each one", () => {
    const h = Array.from({ length: 50 }, (_, i) => turn(i % 2 ? "assistant" : "user", 9_000));
    const out = fitChatHistory(h);
    expect(out.length).toBeLessThanOrEqual(CHAT_LIMITS.maxMessages);
    expect(Math.max(...out.map((t) => t.content.length))).toBeLessThanOrEqual(CHAT_LIMITS.maxMessageChars);
    expect(total(out)).toBeLessThanOrEqual(CHAT_LIMITS.maxHistoryChars);
  });

  it("always starts with a question and skips empty turns", () => {
    const out = fitChatHistory([turn("assistant", 10), turn("user", 0), turn("user", 4), turn("assistant", 4)]);
    expect(out.map((t) => t.role)).toEqual(["user", "assistant"]);
  });

  it("keeps (and cuts) a single over-long question instead of sending nothing", () => {
    const out = fitChatHistory([turn("user", 50_000)]);
    expect(out).toHaveLength(1);
    expect(out[0].content).toHaveLength(CHAT_LIMITS.maxMessageChars);
  });
});
