import { describe, expect, it } from "vitest";
import { announcementVisible, articleMatches } from "../../lib/help/audience";

const now = new Date("2026-10-23T06:00:00.000Z");
const open = { startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-11-01T00:00:00.000Z"), now };

describe("announcements", () => {
  it("shows a live note only to the chosen audience", () => {
    expect(announcementVisible({ ...open, audience: "all", modules: [], isAgent: false })).toBe(true);
    expect(announcementVisible({ ...open, audience: "agents", modules: [], isAgent: false })).toBe(false);
    expect(announcementVisible({ ...open, audience: "agents", modules: [], isAgent: true })).toBe(true);
    expect(announcementVisible({ ...open, audience: "module:STORE", modules: ["MENU"], isAgent: false })).toBe(false);
    expect(announcementVisible({ ...open, audience: "module:STORE", modules: ["STORE"], isAgent: false })).toBe(true);
    expect(announcementVisible({ ...open, audience: "mystery", modules: [], isAgent: true })).toBe(false);
  });

  it("hides a note outside its dates", () => {
    expect(
      announcementVisible({
        audience: "all",
        startsAt: new Date("2026-10-24T00:00:00.000Z"),
        endsAt: new Date("2026-11-01T00:00:00.000Z"),
        now,
        modules: [],
        isAgent: false
      })
    ).toBe(false);
    expect(
      announcementVisible({
        audience: "all",
        startsAt: new Date("2026-09-01T00:00:00.000Z"),
        endsAt: new Date("2026-10-23T05:00:00.000Z"),
        now,
        modules: [],
        isAgent: false
      })
    ).toBe(false);
  });

  it("matches Hindi and English article text", () => {
    const article = { title: "टेबल QR", body: "Print a tent card", category: "Print" };
    expect(articleMatches(article, "")).toBe(true);
    expect(articleMatches(article, "tent")).toBe(true);
    expect(articleMatches(article, "टेबल")).toBe(true);
    expect(articleMatches(article, "billing")).toBe(false);
  });
});
