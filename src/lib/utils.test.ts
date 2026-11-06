import { describe, expect, it } from "vitest";
import { asBarcode, parseBarcode } from "./utils";

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
