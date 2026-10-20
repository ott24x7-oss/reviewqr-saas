import { describe, expect, it } from "vitest";
import { medianMinutes, pairSetupMarks } from "../../lib/tap/setup-time";

describe("time to first QR", () => {
  it("uses the first start and the first activation for each owner", () => {
    const rows = pairSetupMarks([
      { userId: "a", kind: "start", createdAt: new Date("2026-01-01T00:00:00Z") },
      { userId: "a", kind: "qr_activated", createdAt: new Date("2026-01-01T00:10:00Z") },
      { userId: "b", kind: "start", createdAt: new Date("2026-01-01T00:00:00Z") },
      { userId: "b", kind: "qr_activated", createdAt: new Date("2026-01-01T00:30:00Z") },
      { userId: "c", kind: "start", createdAt: new Date("2026-01-01T00:00:00Z") }
    ]);
    expect(medianMinutes(rows)).toEqual({ median: 20, sample: 2 });
  });

  it("returns an empty sample when nobody has finished", () => {
    expect(medianMinutes([])).toEqual({ median: null, sample: 0 });
  });
});
