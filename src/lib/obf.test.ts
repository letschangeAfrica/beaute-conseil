import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getProduct } = await import("./obf");

const reply = (body: unknown, status: number) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })));

afterEach(() => vi.unstubAllGlobals());

describe("getProduct: 'not in the database' is not 'database down'", () => {
  it("returns the normalized product when Open Beauty Facts knows it", async () => {
    reply({ status: 1, product: { product_name: "Mascara Test", brands: "Marque, Autre" } }, 200);
    await expect(getProduct("3600530171910")).resolves.toMatchObject({ code: "3600530171910", name: "Mascara Test", brand: "Marque" });
  });

  it("unknown barcode (HTTP 404, as seen for 6956218100220) → null, so the route answers 404", async () => {
    reply({ status: 0, status_verbose: "product not found" }, 404);
    await expect(getProduct("6956218100220")).resolves.toBeNull();
  });

  it("unknown barcode with HTTP 200 + status 0 → null", async () => {
    reply({ status: 0 }, 200);
    await expect(getProduct("6956218100220")).resolves.toBeNull();
  });

  it("real outage (5xx) still throws, so the route answers 502", async () => {
    reply("Service Unavailable", 503);
    await expect(getProduct("3600530171910")).rejects.toThrow("Open Beauty Facts 503");
  });

  it("invalid barcode never hits the network", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(getProduct("12345")).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
