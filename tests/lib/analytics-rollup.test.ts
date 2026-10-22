import { describe, expect, it } from "vitest";
import { isBotUserAgent } from "../../lib/analytics/bots";
import { compareSummaries, foldDay, foldRange, percentChange, type StoredDay } from "../../lib/analytics/fold";
import { addIstDays, istDayKey, istDayRange, istHour, istParts } from "../../lib/analytics/ist";
import { resolveRange } from "../../lib/analytics/range";
import { hashVisitor } from "../../lib/analytics/visitor";

describe("analytics rollup", () => {
  it("splits an IST day at 18:30 UTC", () => {
    const midnight = new Date("2026-10-22T18:30:00.000Z");
    const before = new Date("2026-10-22T18:29:59.000Z");
    expect(istDayKey(midnight)).toBe("2026-10-23");
    expect(istHour(midnight)).toBe(0);
    expect(istParts(midnight).minute).toBe(0);
    expect(istDayKey(before)).toBe("2026-10-22");
    expect(istHour(before)).toBe(23);
    const range = istDayRange("2026-10-23");
    expect(range.start.toISOString()).toBe("2026-10-22T18:30:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-23T18:30:00.000Z");
    expect(addIstDays("2026-10-22", 1)).toBe("2026-10-23");
  });

  it("counts NFC and QR taps apart from a plain link", () => {
    const at = new Date("2026-10-22T18:30:00.000Z");
    const folded = foldDay({
      scans: [
        { qrCodeId: "table", source: "nfc", deviceType: "mobile", createdAt: at },
        { qrCodeId: "table", source: "qr", deviceType: "desktop", createdAt: at },
        { qrCodeId: "counter", source: null, deviceType: "tablet", createdAt: at },
        { qrCodeId: "counter", source: "link", deviceType: "bot", createdAt: at }
      ],
      taps: [
        { type: "view", linkKey: null, source: "nfc", qrCodeId: "table", createdAt: at },
        { type: "click", linkKey: "whatsapp", source: "qr", qrCodeId: "table", createdAt: at },
        { type: "click", linkKey: "", source: "qr", qrCodeId: "counter", createdAt: at }
      ],
      items: [{ itemId: "chai", name: "Chai" }, { itemId: "chai", name: "Chai" }],
      orders: [{ totalPaise: 15000, table: "T2" }, { totalPaise: 5000, table: "T2" }],
      reviews: [{ rating: 5, staffId: "s1" }, { rating: 4.2, staffId: null }],
      feedbackCount: 3,
      qrs: [
        { id: "table", label: "Table 2", staffId: "s1", staffName: "Asha", table: "T2" },
        { id: "counter", label: "Counter", staffId: null, staffName: null, table: null }
      ]
    });
    expect(folded.scans).toBe(4);
    expect(folded.tapsNfc).toBe(1);
    expect(folded.tapsQr).toBe(2);
    expect(folded.pageViews).toBe(1);
    expect(folded.buttonClicks).toEqual({ whatsapp: 1, button: 1 });
    expect(folded.menuViews).toBe(2);
    expect(folded.topItems).toEqual([{ itemId: "chai", name: "Chai", views: 2 }]);
    expect(folded.orderCount).toBe(2);
    expect(folded.orderPaise).toBe(20000);
    expect(folded.ratings["5"]).toBe(1);
    expect(folded.ratings["4"]).toBe(1);
    expect(folded.hours[0]).toBe(4);
    expect(folded.byDevice).toEqual({ mobile: 1, tablet: 1, desktop: 1, other: 1 });
    expect(folded.byQr.find((row) => row.qrId === "table")).toMatchObject({ nfc: 1, qr: 1, scans: 2 });
    expect(folded.byTable).toEqual([{ table: "T2", scans: 2, orders: 2 }]);
    expect(folded.byStaff).toEqual([{ staffId: "s1", name: "Asha", scans: 2, feedback: 1 }]);
  });

  it("ignores crawlers and keeps an empty user agent", () => {
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBotUserAgent("WhatsApp/2.1")).toBe(true);
    expect(isBotUserAgent("curl/8.0")).toBe(true);
    expect(isBotUserAgent("")).toBe(false);
    expect(isBotUserAgent(null)).toBe(false);
    expect(isBotUserAgent("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile")).toBe(false);
  });

  it("hashes a visitor id and rejects a short one", () => {
    const first = hashVisitor("visitor-123456", "salt");
    const second = hashVisitor("visitor-123456", "salt");
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toBe(first);
    expect(hashVisitor("visitor-999999", "salt")).not.toBe(first);
    expect(hashVisitor("short", "salt")).toBe("");
    expect(first.includes("visitor-123456")).toBe(false);
  });

  it("does not invent a percent when the previous period is empty", () => {
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
    expect(percentChange(15, 10)).toBe(50);
    expect(percentChange(5, 10)).toBe(-50);
    const day = (scans: number): StoredDay => ({
      day: "2026-10-01",
      scans,
      tapsNfc: 0,
      tapsQr: scans,
      pageViews: scans,
      buttonClicks: {},
      menuViews: 0,
      topItems: [],
      orderCount: 0,
      orderPaise: 0,
      feedbackCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      ratings: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      hours: Array.from({ length: 24 }, () => 0),
      byQr: [],
      byStaff: [],
      byDevice: { mobile: 0, tablet: 0, desktop: 0, other: 0 },
      byTable: []
    });
    const change = compareSummaries(foldRange([day(4)]), foldRange([day(0)]));
    expect(change.scans).toBeNull();
    expect(change.avgRating).toBeNull();
  });

  it("compares the previous window of the same length", () => {
    const now = new Date("2026-10-23T06:00:00.000Z");
    const week = resolveRange({ preset: "7d", now });
    expect(week.from).toBe("2026-10-17");
    expect(week.to).toBe("2026-10-23");
    expect(week.days).toBe(7);
    expect(week.previousFrom).toBe("2026-10-10");
    expect(week.previousTo).toBe("2026-10-16");
    const month = resolveRange({ preset: "30d", now });
    expect(month.days).toBe(30);
    expect(month.from).toBe("2026-09-24");
    const custom = resolveRange({ preset: "custom", from: "2026-10-20", to: "2026-10-10", now });
    expect(custom.from).toBe("2026-10-10");
    expect(custom.to).toBe("2026-10-20");
    expect(custom.days).toBe(11);
  });
});
