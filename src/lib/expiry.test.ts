import { describe, expect, it } from "vitest";
import { daysLeft, expiryStatus, leftLabel, useBy } from "./expiry";

describe("useBy", () => {
  it("adds whole months", () => {
    expect(useBy({ openedAt: "2026-03-15", months: 12 })).toBe("2027-03-15");
    expect(useBy({ openedAt: "2026-11-07", months: 6 })).toBe("2027-05-07");
  });

  it("clamps to the end of shorter months", () => {
    expect(useBy({ openedAt: "2026-01-31", months: 1 })).toBe("2026-02-28");
    expect(useBy({ openedAt: "2027-01-31", months: 1 })).toBe("2027-02-28");
    expect(useBy({ openedAt: "2028-01-31", months: 1 })).toBe("2028-02-29");
  });
});

describe("status", () => {
  const item = { openedAt: "2026-01-10", months: 6 }; // use by 2026-07-10

  it("counts days left, negative once expired", () => {
    expect(daysLeft(item, "2026-07-01")).toBe(9);
    expect(daysLeft(item, "2026-07-10")).toBe(0);
    expect(daysLeft(item, "2026-07-13")).toBe(-3);
  });

  it("is ok, then soon (30 days), then expired", () => {
    expect(expiryStatus(item, "2026-05-01")).toBe("ok");
    expect(expiryStatus(item, "2026-06-10")).toBe("soon");
    expect(expiryStatus(item, "2026-07-10")).toBe("soon");
    expect(expiryStatus(item, "2026-07-11")).toBe("expired");
  });

  it("is not thrown off by daylight saving changes", () => {
    expect(daysLeft({ openedAt: "2026-03-01", months: 1 }, "2026-03-28")).toBe(4);
  });
});

describe("leftLabel", () => {
  it("speaks plain French", () => {
    expect(leftLabel(-1)).toBe("Expiré depuis 1 jour");
    expect(leftLabel(-5)).toBe("Expiré depuis 5 jours");
    expect(leftLabel(0)).toBe("À finir aujourd'hui");
    expect(leftLabel(12)).toBe("Encore 12 jours");
    expect(leftLabel(180)).toBe("Encore 6 mois");
  });
});
