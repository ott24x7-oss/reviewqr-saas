import { describe, expect, it } from "vitest";
import { clockOnDay, mondayKey, monthlyDue, sendSlots, wantsReport, weeklyDue } from "../../lib/reports/schedule";
import { buildMonthlyPdf, lineNeedsRaster, rasterLine } from "../../lib/reports/pdf";
import { istWeekdayIndex } from "../../lib/analytics/ist";

describe("report schedule", () => {
  it("sends on Monday at the configured IST clock and catches up later that week", () => {
    const probe = new Date("2026-10-26T03:30:00.000Z");
    const monday = mondayKey(probe);
    expect(istWeekdayIndex(monday)).toBe(1);
    const dueAt = clockOnDay(monday, 9, 0);
    expect(weeklyDue(new Date(dueAt.getTime() - 1000), 9, 0)).toBeNull();
    expect(weeklyDue(dueAt, 9, 0)).toBe(monday);
    expect(weeklyDue(new Date(dueAt.getTime() + 3 * 86400000), 9, 0)).toBe(monday);
    const month = monthlyDue(new Date("2026-11-01T03:29:00.000Z"), 9, 0);
    expect(month).toBeNull();
    expect(monthlyDue(new Date("2026-11-01T03:30:00.000Z"), 9, 0)).toBe("2026-11");
  });

  it("keeps email on by default and honours unsubscribe", () => {
    expect(wantsReport(null, "email")).toBe(true);
    expect(wantsReport(null, "whatsapp")).toBe(false);
    expect(wantsReport({ emailOptIn: false, whatsappOptIn: true, unsubscribedAt: null }, "email")).toBe(false);
    expect(wantsReport({ emailOptIn: false, whatsappOptIn: true, unsubscribedAt: null }, "whatsapp")).toBe(true);
    expect(wantsReport({ emailOptIn: true, whatsappOptIn: true, unsubscribedAt: new Date("2026-10-01T00:00:00.000Z") }, "email")).toBe(false);
    expect(wantsReport({ emailOptIn: true, whatsappOptIn: true, unsubscribedAt: new Date("2026-10-01T00:00:00.000Z") }, "whatsapp")).toBe(false);
  });

  it("spreads sends so only N leave in the same minute", () => {
    const start = new Date("2026-10-26T03:30:00.000Z");
    const slots = sendSlots(["a", "b", "c", "d", "e"], 2, start);
    expect(slots.map((slot) => slot.runAt.getTime())).toEqual([
      start.getTime(),
      start.getTime(),
      start.getTime() + 60_000,
      start.getTime() + 60_000,
      start.getTime() + 120_000
    ]);
    expect(sendSlots([1], 0, start)[0]?.runAt.getTime()).toBe(start.getTime());
  });

  it("builds a PDF and rasterizes Hindi", async () => {
    expect(lineNeedsRaster("Cafe")).toBe(false);
    expect(lineNeedsRaster("चाय घर")).toBe(true);
    const png = await rasterLine("चाय घर");
    expect(png.subarray(0, 4).toString("hex")).toBe("89504e47");
    const pdf = await buildMonthlyPdf({
      businessName: "चाय घर",
      monthLabel: "October 2026",
      rows: [{ label: "Scans", value: "14" }]
    });
    expect(pdf.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    expect(pdf.includes(Buffer.from("/Subtype /Image")) || pdf.includes(Buffer.from("Image"))).toBe(true);
  });
});
