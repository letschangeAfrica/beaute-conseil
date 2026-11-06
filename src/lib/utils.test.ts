import { afterEach, describe, expect, it, vi } from "vitest";
import { GENERIC_ERROR, NETWORK_ERROR, asBarcode, errorMessage, parseBarcode, postJson } from "./utils";

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
