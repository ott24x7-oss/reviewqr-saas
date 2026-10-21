import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { chromium } from "@playwright/test";
import type { PrintDesign } from "../lib/print/design";
import { exportPrint } from "../lib/print/export";
import { faceLayout, fitQrMm } from "../lib/print/layout";
import { templateById } from "../lib/print/templates";
import { tapText } from "../lib/tap/i18n";

async function paint(text: string, widthMm: number, heightMm: number) {
  const font = readFileSync("fonts/noto-sans-devanagari-latin-devanagari-600.woff2").toString("base64");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><style>
    @font-face { font-family: "Noto Deva"; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 600; font-style: normal; }
  </style><canvas id="c"></canvas>`);
  const dataUrl = await page.evaluate(async ({ text, widthMm, heightMm }) => {
    await document.fonts.load('600 16px "Noto Deva"');
    const scale = 600 / 25.4;
    const canvas = document.getElementById("c") as HTMLCanvasElement;
    canvas.width = Math.max(1, Math.round(widthMm * scale));
    canvas.height = Math.max(1, Math.round(heightMm * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#3a2016";
    ctx.textBaseline = "middle";
    let px = heightMm * scale * 0.72;
    ctx.font = `600 ${px}px "Noto Deva"`;
    while (px > 10 && ctx.measureText(text).width > canvas.width * 0.98) {
      px *= 0.94;
      ctx.font = `600 ${px}px "Noto Deva"`;
    }
    ctx.fillText(text, 0, canvas.height / 2);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let ink = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 10) ink += 1;
    if (ink < 40) throw new Error("Hindi raster is blank");
    return canvas.toDataURL("image/png");
  }, { text, widthMm, heightMm });
  await browser.close();
  const raw = dataUrl.split(",")[1];
  return Buffer.from(raw, "base64");
}

async function main() {
  const template = templateById("cr80");
  if (!template) throw new Error("Missing CR80");
  const qrMm = fitQrMm(template, 28);
  const slot = faceLayout(template, qrMm).ctaHi;
  const heightMm = slot.size * 1.35;
  const text = tapText("hi", "printCta");
  const png = await paint(text, slot.maxWidth, heightMm);
  const design: PrintDesign = {
    templateId: "cr80",
    name: "Spice Junction",
    cta: tapText("en", "printCta"),
    ctaHi: text,
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
    rasters: [{
      id: "cta-hi",
      bytes: new Uint8Array(png),
      xMm: slot.x,
      yMm: slot.y,
      widthMm: slot.maxWidth,
      heightMm
    }]
  };
  mkdirSync("docs/print-nfc", { recursive: true });
  writeFileSync("docs/print-nfc/cr80-hindi-cta.png", png);
  const exact = await exportPrint({
    design,
    preset: "exact",
    format: "pdf",
    codes: [{ code: "SAMPLECARD01", label: "Counter" }]
  });
  writeFileSync("docs/print-nfc/cr80-hindi.pdf", exact.body);
  console.log(`pdf ${exact.body.length} png ${png.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
