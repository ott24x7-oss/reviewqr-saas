import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const srcDir = process.argv[2];
const outDir = path.resolve("public/landing");
if (!srcDir) {
  console.error("Pass the folder of source images");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const jobs = [
  ["hero", "4.jpg", 1600, 900],
  ["og", "4.jpg", 1200, 630],
  ["product-reviews", "6.jpg", 1200, 1200],
  ["product-menu", "7.jpg", 1200, 1200],
  ["product-store", "5.jpg", 1200, 1200],
  ["product-profile", "8.jpg", 1200, 1200],
  ["product-combo", "9.jpg", 1200, 1200],
  ["step-choose", "12.jpg", 1200, 1200],
  ["step-ship", "11.jpg", 1200, 1200],
  ["step-setup", "10.jpg", 1200, 1200],
  ["step-scan", "15.jpg", 1200, 1200],
  ["step-results", "13.jpg", 1200, 1200],
  ["step-track", "14.jpg", 1200, 1200],
  ["use-cafe", "4.jpg", 1200, 800],
  ["use-salon", "20.jpg", 1200, 800],
  ["use-shop", "18.jpg", 1200, 800],
  ["use-clinic", "21.jpg", 1200, 800],
  ["spot-shield", "17.jpg", 800, 800],
  ["spot-time", "19.jpg", 800, 800],
  ["spot-india", "16.jpg", 800, 800]
];

async function encode(pipeline, format) {
  const qualities = format === "avif" ? [46, 38, 30, 24] : [68, 58, 48, 40, 32];
  let last = null;
  for (const quality of qualities) {
    const buf = await pipeline.clone()[format]({ quality, effort: 4 }).toBuffer();
    last = buf;
    if (buf.length <= 150 * 1024) break;
  }
  return last;
}

const sizes = {};
for (const [name, file, width, height] of jobs) {
  const input = path.join(srcDir, file);
  const meta = await sharp(input).metadata();
  const cropW = Math.max(32, Math.round((meta.width || width) * 0.92));
  const cropH = Math.max(32, Math.round((meta.height || height) * 0.9));
  const trimmed = sharp(input).extract({ left: 0, top: 0, width: cropW, height: cropH });
  const desktop = trimmed.clone().resize(width, height, { fit: "cover", position: "attention" });
  const mobile = trimmed.clone().resize(Math.round(width / 2), Math.round(height / 2), { fit: "cover", position: "attention" });
  const desktopWebp = await encode(desktop, "webp");
  const mobileWebp = await encode(mobile, "webp");
  let desktopAvif = null;
  let mobileAvif = null;
  try {
    desktopAvif = await encode(desktop, "avif");
    mobileAvif = await encode(mobile, "avif");
  } catch (error) {
    console.error("avif skipped", name, error instanceof Error ? error.message : error);
  }
  fs.writeFileSync(path.join(outDir, `${name}-1600.webp`), desktopWebp);
  fs.writeFileSync(path.join(outDir, `${name}-800.webp`), mobileWebp);
  if (desktopAvif) fs.writeFileSync(path.join(outDir, `${name}-1600.avif`), desktopAvif);
  if (mobileAvif) fs.writeFileSync(path.join(outDir, `${name}-800.avif`), mobileAvif);
  sizes[name] = {
    width,
    height,
    desktopWebp: desktopWebp.length,
    mobileWebp: mobileWebp.length,
    desktopAvif: desktopAvif ? desktopAvif.length : 0,
    mobileAvif: mobileAvif ? mobileAvif.length : 0
  };
  console.log(name, desktopWebp.length, mobileWebp.length, desktopAvif ? desktopAvif.length : 0);
}
fs.writeFileSync(path.join(outDir, "sizes.json"), JSON.stringify(sizes, null, 2));
