import { describe, expect, it } from "vitest";
import { safeRedirect } from "./redirect";

const tab = String.fromCharCode(9);
const newline = String.fromCharCode(10);

describe("safeRedirect (audit M-1)", () => {
  it("keeps same-site paths, with query and hash", () => {
    expect(safeRedirect("/profil")).toBe("/profil");
    expect(safeRedirect("/recherche?q=fond%20de%20teint#r")).toBe("/recherche?q=fond%20de%20teint#r");
    expect(safeRedirect(["/scanner", "/x"])).toBe("/scanner");
  });

  it("refuses other sites in every disguise", () => {
    for (const evil of ["//evil.example", "/\\evil.example", `/${tab}/evil.example`, `/${newline}/evil.example`, "https://evil.example", "javascript:alert(1)", "evil.example", "/%09/evil.example".replace("%09", tab)]) {
      expect(safeRedirect(evil)).toBe("/profil");
    }
  });

  it("falls back on empty input, with a custom fallback", () => {
    expect(safeRedirect(undefined)).toBe("/profil");
    expect(safeRedirect("", "/")).toBe("/");
  });

  it("normalises dot segments without leaving the site", () => {
    expect(safeRedirect("/a/../profil")).toBe("/profil");
  });
});
