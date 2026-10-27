import { describe, expect, it } from "vitest";
import { QR_ALPHABET, QR_ID_LENGTH, isGeneratedQrId, isLookupCode, makeQrPublicId } from "../../lib/tap/ids";
import { safeTapUrl } from "../../lib/tap/urls";
import { contrastRatio, meetsTextContrast, readableOn } from "../../lib/tap/contrast";
import { closeTimeAt, isOpenAt } from "../../lib/tap/hours";
import { buildOrderText, fitWhatsAppOrder, formatRupees } from "../../lib/tap/order-message";
import { tapLang, tapText } from "../../lib/tap/i18n";

describe("QR public ids", () => {
  it("uses 12 characters from a 32-symbol alphabet with 60 bits", () => {
    expect(QR_ALPHABET.length).toBe(32);
    expect(QR_ID_LENGTH).toBe(12);
    expect(QR_ALPHABET).not.toMatch(/[01IO]/);
    const id = makeQrPublicId();
    expect(isGeneratedQrId(id)).toBe(true);
    expect(id).toHaveLength(12);
  });

  it("still looks up older printed codes", () => {
    expect(isLookupCode("DEMO-CNTR")).toBe(true);
    expect(isLookupCode("AB12")).toBe(true);
    expect(isLookupCode("a")).toBe(false);
    expect(isLookupCode("javascript:alert(1)")).toBe(false);
  });
});

describe("tap URLs", () => {
  it("allows https and rejects javascript, data, and plain http", () => {
    expect(safeTapUrl("https://example.com/menu", "https")).toBe("https://example.com/menu");
    expect(safeTapUrl("http://example.com", "https")).toBeNull();
    expect(safeTapUrl("javascript:alert(1)", "https")).toBeNull();
    expect(safeTapUrl("data:text/html,hi", "https")).toBeNull();
  });

  it("allows tel, upi, and Google Maps only for those kinds", () => {
    expect(safeTapUrl("tel:+919876543210", "tel")).toBe("tel:+919876543210");
    expect(safeTapUrl("https://evil.com", "tel")).toBeNull();
    expect(safeTapUrl("upi://pay?pa=cafe@upi&cu=INR", "upi")).toBe("upi://pay?pa=cafe@upi&cu=INR");
    expect(safeTapUrl("https://maps.google.com/?q=cafe", "maps")).toContain("maps.google.com");
    expect(safeTapUrl("https://evil.com/maps", "maps")).toBeNull();
  });
});

describe("contrast", () => {
  it("rejects low-contrast text and picks a readable colour", () => {
    expect(meetsTextContrast("#777777", "#888888")).toBe(false);
    expect(meetsTextContrast("#111111", "#ffffff")).toBe(true);
    expect(contrastRatio("#000000", "#ffffff")).toBeGreaterThan(20);
    expect(readableOn("#111111")).toBe("#ffffff");
    expect(readableOn("#fff8ee")).toBe("#111111");
  });
});

describe("opening hours", () => {
  const hours = {
    tue: { open: "09:00", close: "18:00" },
    fri: { open: "22:00", close: "02:00" }
  };

  it("uses India time and hides the badge when hours are empty", () => {
    expect(isOpenAt(null)).toBeNull();
    expect(isOpenAt({})).toBeNull();
    // 10:00 IST on Tuesday 20 Oct 2026
    expect(isOpenAt(hours, new Date("2026-10-20T04:30:00Z"))).toBe(true);
    // 19:30 IST the same day
    expect(isOpenAt(hours, new Date("2026-10-20T14:00:00Z"))).toBe(false);
  });

  it("keeps an overnight range open after midnight", () => {
    // Friday 23:00 IST = 17:30 UTC on 23 Oct 2026
    expect(isOpenAt(hours, new Date("2026-10-23T17:30:00Z"))).toBe(true);
    // Saturday 01:00 IST
    expect(isOpenAt(hours, new Date("2026-10-23T19:30:00Z"))).toBe(true);
  });

  it("reports the closing time of the window that is open now", () => {
    expect(closeTimeAt(null)).toBeNull();
    expect(closeTimeAt(hours, new Date("2026-10-20T04:30:00Z"))).toBe("18:00");
    expect(closeTimeAt(hours, new Date("2026-10-20T14:00:00Z"))).toBeNull();
    expect(closeTimeAt(hours, new Date("2026-10-23T19:30:00Z"))).toBe("02:00");
  });
});

describe("WhatsApp order text", () => {
  it("formats the summary in rupees and stays inside the URL limit", () => {
    const input = {
      businessName: "Demo Cafe",
      lines: [
        { name: "Cappuccino", qty: 2, unitPaise: 12000 },
        { name: "Veg Sandwich", qty: 1, unitPaise: 12000, note: "no onion" }
      ],
      tableOrAddress: "4",
      customerName: "Rahul",
      note: "Please hurry"
    };
    const text = buildOrderText(input);
    expect(text).toBe(
      [
        "New order — Demo Cafe",
        "1. Cappuccino × 2 — ₹240",
        "2. Veg Sandwich × 1 — ₹120  (Note: no onion)",
        "Total: ₹360",
        "Table: 4 | Name: Rahul",
        "Note: Please hurry"
      ].join("\n")
    );
    expect(formatRupees(12050)).toBe("₹120.50");
    const fitted = fitWhatsAppOrder("919876543210", {
      ...input,
      note: "x".repeat(4000),
      lines: input.lines.map((line) => ({ ...line, note: "y".repeat(2000) }))
    });
    expect(fitted.url.length).toBeLessThanOrEqual(1800);
    expect(fitted.url.startsWith("https://wa.me/919876543210?text=")).toBe(true);
    expect(decodeURIComponent(fitted.url.split("text=")[1])).toContain("New order — Demo Cafe");
  });

  it("translates the labels", () => {
    const text = buildOrderText({
      businessName: "Demo Cafe",
      hindi: true,
      lines: [{ name: "चाय", qty: 1, unitPaise: 2000 }]
    });
    expect(text.startsWith("नया ऑर्डर — Demo Cafe")).toBe(true);
    expect(text).toContain("कुल: ₹20");
  });
});

describe("tap language", () => {
  it("defaults from the browser language and remembers a stored choice", () => {
    expect(tapLang("hi-IN,en;q=0.8")).toBe("hi");
    expect(tapLang("en-US")).toBe("en");
    expect(tapLang("hi-IN", "en")).toBe("en");
    expect(tapText("hi", "giveFeedback")).toBe("प्रतिक्रिया दें");
  });
});
