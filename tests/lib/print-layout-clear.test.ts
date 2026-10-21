import { describe, expect, it } from "vitest";
import { faceLayout, fitQrMm } from "../../lib/print/layout";
import { PRINT_TEMPLATES } from "../../lib/print/templates";

type Box = { x: number; y: number; w: number; h: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("print face layout keeps the QR clear", () => {
  for (const template of PRINT_TEMPLATES) {
    it(`${template.id}: text, stars and the NFC row never overlap the QR`, () => {
      const qrMm = fitQrMm(template);
      const layout = faceLayout(template, qrMm);
      const qr: Box = { x: layout.qr.x, y: layout.qr.y, w: layout.qr.size, h: layout.qr.size };
      const starsW = 5 * layout.stars.size + 4 * 0.7;
      const others: Box[] = [
        { x: layout.name.x, y: layout.name.y, w: layout.name.maxWidth, h: layout.name.size },
        { x: layout.cta.x, y: layout.cta.y, w: layout.cta.maxWidth, h: layout.cta.size },
        { x: layout.ctaHi.x, y: layout.ctaHi.y, w: layout.ctaHi.maxWidth, h: layout.ctaHi.size },
        { x: layout.stars.x, y: layout.stars.y, w: starsW, h: layout.stars.size },
        { x: layout.nfc.x, y: layout.nfc.y, w: layout.nfc.size, h: layout.nfc.size }
      ];
      for (const box of others) expect(overlaps(qr, box)).toBe(false);
      expect(layout.qr.size).toBeGreaterThan(0);
      expect(layout.qr.x).toBeGreaterThanOrEqual(0);
      expect(layout.qr.y + layout.qr.size).toBeLessThanOrEqual(template.heightMm);
    });
  }

  it("reports the size that actually fits, so the 20 mm warning sees the real QR", () => {
    const keychain = PRINT_TEMPLATES.find((t) => t.id === "keychain")!;
    const fitted = fitQrMm(keychain, 40);
    expect(fitted).toBe(faceLayout(keychain, fitted).qr.size);
    expect(fitted).toBeLessThanOrEqual(40);
  });
});
