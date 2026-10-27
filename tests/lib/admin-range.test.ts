import { describe, expect, it } from "vitest";
import { adminWindow, dayKey, indiaDate } from "@/lib/admin/range";

describe("admin dashboard date ranges", () => {
  const now = new Date("2026-10-26T12:00:00+05:30");

  it("starts quarter and year presets at their India calendar boundaries", () => {
    const quarter = adminWindow(new URLSearchParams("range=qtd"), now);
    const year = adminWindow(new URLSearchParams("range=ytd"), now);
    expect(quarter.ok && dayKey(quarter.window.start)).toBe("2026-10-01");
    expect(year.ok && dayKey(year.window.start)).toBe("2026-01-01");
    expect(quarter.ok && dayKey(new Date(quarter.window.end.getTime() - 1))).toBe("2026-10-26");
  });

  it("accepts real custom dates and rejects normalized invalid dates", () => {
    expect(indiaDate("2024-02-29")).not.toBeNull();
    expect(indiaDate("2024-02-30")).toBeNull();
    const valid = adminWindow(new URLSearchParams("range=custom&from=2024-02-29&to=2024-03-01"), now);
    const reversed = adminWindow(new URLSearchParams("range=custom&from=2024-03-01&to=2024-02-29"), now);
    expect(valid.ok && dayKey(valid.window.start)).toBe("2024-02-29");
    expect(reversed.ok).toBe(false);
  });
});
