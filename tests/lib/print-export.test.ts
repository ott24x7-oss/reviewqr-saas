import { PDFDocument } from "pdf-lib";
import { inflateRawSync } from "zlib";
import { describe, expect, it } from "vitest";
import type { PrintDesign } from "../../lib/print/design";
import { exportPrint } from "../../lib/print/export";
import { fitQrMm } from "../../lib/print/layout";
import { templateById } from "../../lib/print/templates";
import { mmToPt } from "../../lib/print/units";

const design: PrintDesign = {
  templateId: "cr80",
  name: "Spice Junction",
  cta: "Scan or tap to order and review",
  ctaHi: "",
  backLine: "Tap the other side",
  background: "#fff7ed",
  backgroundTo: "#ffd7a8",
  foreground: "#3a2016",
  qrDark: "#111111",
  qrLight: "#ffffff",
  module: "rounded",
  eye: "rounded",
  showNfc: true,
  showStars: true,
  qrMm: 28,
  rasters: []
};

describe("print export", () => {
  it("builds an exact CR80 PDF with a front and a back at trim size", async () => {
    const file = await exportPrint({
      design,
      preset: "exact",
      format: "pdf",
      codes: [{ code: "SAMPLECARD01", label: "Counter" }]
    });
    const doc = await PDFDocument.load(file.body);
    expect(file.body.subarray(0, 4).toString()).toBe("%PDF");
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(mmToPt(85.6), 2);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(mmToPt(54), 2);
  });

  it("adds 3 mm bleed to the page", async () => {
    const file = await exportPrint({
      design,
      preset: "bleed",
      format: "pdf",
      codes: [{ code: "SAMPLECARD01", label: "Counter" }]
    });
    const doc = await PDFDocument.load(file.body);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(mmToPt(91.6), 2);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(mmToPt(60), 2);
  });

  it("imposes 10 CR80 fronts on one A4 sheet and continues onto a second", async () => {
    const codes = Array.from({ length: 11 }, (_, index) => ({
      code: `SHEETCARD${String(index + 1).padStart(2, "0")}`,
      label: `Card ${index + 1}`
    }));
    const file = await exportPrint({ design, preset: "sheet", sheetId: "a4", format: "pdf", codes });
    const doc = await PDFDocument.load(file.body);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(mmToPt(210), 2);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(mmToPt(297), 2);
  });

  it("zips the PDF with Node zlib", async () => {
    const file = await exportPrint({
      design,
      preset: "exact",
      format: "zip",
      codes: [{ code: "SAMPLECARD01", label: "Counter" }]
    });
    expect(file.contentType).toBe("application/zip");
    expect(file.body.subarray(0, 2).toString()).toBe("PK");
    const nameLen = file.body.readUInt16LE(26);
    const compLen = file.body.readUInt32LE(18);
    const inflated = inflateRawSync(file.body.subarray(30 + nameLen, 30 + nameLen + compLen));
    expect(inflated.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("writes one SVG for a single-face piece", async () => {
    const file = await exportPrint({
      design: { ...design, templateId: "keychain", qrMm: 20 },
      preset: "exact",
      format: "svg",
      codes: [{ code: "KEYCHAIN001", label: "Keys" }]
    });
    const text = file.body.toString("utf8");
    expect(file.contentType).toBe("image/svg+xml");
    expect(text).toContain('width="30mm"');
    expect(text).toContain("KEYCHAIN001");
  });

  it("rejects inverted QR colours and Hindi without a raster", async () => {
    await expect(
      exportPrint({
        design: { ...design, qrDark: "#ffffff", qrLight: "#111111" },
        preset: "exact",
        format: "pdf",
        codes: [{ code: "SAMPLECARD01", label: "Counter" }]
      })
    ).rejects.toThrow(/darker than the light background/);
    await expect(
      exportPrint({
        design: { ...design, ctaHi: "ऑर्डर के लिए स्कैन करें" },
        preset: "exact",
        format: "pdf",
        codes: [{ code: "SAMPLECARD01", label: "Counter" }]
      })
    ).rejects.toThrow(/Hindi/);
  });

  it("keeps a keychain QR at least 20 mm when the safe area allows it", () => {
    expect(fitQrMm(templateById("keychain")!)).toBeGreaterThanOrEqual(20);
    expect(fitQrMm(templateById("cr80")!)).toBeGreaterThanOrEqual(20);
  });
});
