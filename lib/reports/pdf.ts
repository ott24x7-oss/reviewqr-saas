import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { DEFAULT_BRAND_NAME } from "../brand-defaults";

export function lineNeedsRaster(text: string) {
  return /[^\x20-\x7e]/.test(text);
}

function escapeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Devanagari is drawn as a PNG. pdf-lib's standard fonts cannot shape it. */
export async function rasterLine(text: string) {
  const fontFile = path.join(process.cwd(), "fonts", "noto-sans-devanagari-latin-devanagari-600.woff2");
  const font = fs.existsSync(fontFile) ? fs.readFileSync(fontFile).toString("base64") : "";
  const width = Math.min(1400, Math.max(280, text.length * 26));
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="64" xmlns="http://www.w3.org/2000/svg">
  <style>
    @font-face { font-family: "Noto Devanagari"; src: url("data:font/woff2;base64,${font}") format("woff2"); }
  </style>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="2" y="42" font-family="Noto Devanagari, 'Nirmala UI', sans-serif" font-size="32" fill="#1C1B18">${escapeXml(text)}</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export type MonthlyReportInput = {
  businessName: string;
  monthLabel: string;
  rows: Array<{ label: string; value: string }>;
};

export async function buildMonthlyPdf(input: MonthlyReportInput) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.11, 0.1, 0.09);
  page.drawText(DEFAULT_BRAND_NAME, { x: 48, y: 790, size: 12, font: bold, color: ink });
  page.drawText(input.monthLabel, { x: 48, y: 768, size: 16, font: bold, color: ink });
  let y = 730;
  if (lineNeedsRaster(input.businessName)) {
    const png = await rasterLine(input.businessName);
    const image = await doc.embedPng(png);
    const scale = Math.min(1, 480 / image.width);
    page.drawImage(image, { x: 48, y: y - image.height * scale, width: image.width * scale, height: image.height * scale });
    y -= image.height * scale + 16;
  } else {
    page.drawText(input.businessName || "Business", { x: 48, y, size: 18, font: bold, color: ink });
    y -= 28;
  }
  for (const row of input.rows) {
    if (y < 72) break;
    const label = row.label.replace(/[^\x20-\x7e]/g, "").slice(0, 48) || "Item";
    const value = row.value.replace(/[^\x20-\x7e]/g, "").slice(0, 32);
    page.drawText(label, { x: 48, y, size: 12, font, color: ink });
    page.drawText(value, { x: 360, y, size: 12, font: bold, color: ink });
    y -= 22;
  }
  page.drawText("Times are Asia/Kolkata.", { x: 48, y: 48, size: 9, font, color: rgb(0.4, 0.38, 0.35) });
  return Buffer.from(await doc.save());
}
