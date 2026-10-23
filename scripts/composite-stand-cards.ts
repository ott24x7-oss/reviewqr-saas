/**
 * Place the real QR24x7 logo and a real QR on the blank stand photos.
 * Run: npx tsx scripts/composite-stand-cards.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions, type Sharp } from "sharp";
import QRCode from "qrcode";

const SRC =
  process.env.STAND_SRC ||
  path.join(
    process.env.USERPROFILE || "",
    ".grok",
    "sessions",
    "C%3A%5CUsers%5Cdiwak%5COneDrive%5CDesktop%5CReview%20QR%5Creviewqr-saas",
    "01a15a91-1bba-7563-81ac-ad3ee96265da",
    "images"
  );

const FILES: Record<string, string> = {
  "product-reviews": "32.jpg",
  "product-reviews-b": "33.jpg",
  "product-menu": "36.jpg",
  "product-menu-b": "35.jpg",
  "product-store": "38.jpg",
  "product-store-b": "41.jpg",
  "product-profile": "37.jpg",
  "product-profile-b": "40.jpg",
  "product-combo": "34.jpg",
  "product-combo-b": "39.jpg"
};

const QR_URL = "https://qr24x7.in/t/DEMO-CNTR";

type Point = { x: number; y: number };
type CardQuad = { count: number; tl: Point; tr: Point; br: Point; bl: Point };

function isInsert(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Blank paper is neutral and brighter than the oak and the grey wall.
  return min > 175 && max - min < 16;
}

function cross(o: Point, a: Point, b: Point) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function convexHull(points: Point[]) {
  const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const unique: Point[] = [];
  for (const point of sorted) {
    const last = unique[unique.length - 1];
    if (last && last.x === point.x && last.y === point.y) continue;
    unique.push(point);
  }
  const lower: Point[] = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Point[] = [];
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const point = unique[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function quadArea(quad: Point[]) {
  let area = 0;
  for (let index = 0; index < 4; index += 1) {
    const a = quad[index];
    const b = quad[(index + 1) % 4];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

/** Largest-area quadrilateral on the outline. This keeps a flat rotated sticker from collapsing to a line. */
function orderQuad(points: Point[]): Point[] {
  const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const ring = points
    .slice()
    .sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  let topIndex = 0;
  let topScore = Infinity;
  for (let index = 0; index < 4; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % 4];
    const score = (a.y + b.y) / 2;
    if (score < topScore) {
      topScore = score;
      topIndex = index;
    }
  }
  const a = ring[topIndex];
  const b = ring[(topIndex + 1) % 4];
  const leftToRight = a.x <= b.x;
  const tl = leftToRight ? a : b;
  const tr = leftToRight ? b : a;
  if (leftToRight) return [tl, tr, ring[(topIndex + 2) % 4], ring[(topIndex + 3) % 4]];
  return [tl, tr, ring[(topIndex + 3) % 4], ring[(topIndex + 2) % 4]];
}

function largestWhite(data: Buffer, width: number, height: number, channels: number): CardQuad | null {
  const seen = new Uint8Array(width * height);
  const white = (pixel: number, x: number) => {
    if (x < width * 0.08) return false;
    const offset = pixel * channels;
    return isInsert(data[offset], data[offset + 1], data[offset + 2]);
  };
  let bestSeed = -1;
  let bestCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (seen[start] || !white(start, x)) continue;
      let count = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const current = stack.pop() as number;
        const cx = current % width;
        const cy = (current / width) | 0;
        count += 1;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        const next = [current - 1, current + 1, current - width, current + width];
        for (const candidate of next) {
          if (candidate < 0 || candidate >= width * height || seen[candidate]) continue;
          const nx = candidate % width;
          if (Math.abs(nx - cx) > 1) continue;
          seen[candidate] = 1;
          if (white(candidate, nx)) stack.push(candidate);
        }
      }
      const edge = minX <= 2 || minY <= 2 || maxX >= width - 3 || maxY >= height - 3;
      if (edge || count < 400) continue;
      if (count > bestCount) {
        bestCount = count;
        bestSeed = start;
      }
    }
  }
  if (bestSeed < 0) return null;
  const mask = new Uint8Array(width * height);
  const stack = [bestSeed];
  mask[bestSeed] = 1;
  while (stack.length) {
    const current = stack.pop() as number;
    const cx = current % width;
    for (const candidate of [current - 1, current + 1, current - width, current + width]) {
      if (candidate < 0 || candidate >= width * height || mask[candidate]) continue;
      const nx = candidate % width;
      if (Math.abs(nx - cx) > 1) continue;
      if (!white(candidate, nx)) continue;
      mask[candidate] = 1;
      stack.push(candidate);
    }
  }
  const boundary: Point[] = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixel = y * width + x;
      if (!mask[pixel]) continue;
      if (mask[pixel - 1] && mask[pixel + 1] && mask[pixel - width] && mask[pixel + width]) continue;
      boundary.push({ x, y });
    }
  }
  const hull = convexHull(boundary);
  if (hull.length < 4) return null;
  const step = Math.max(1, Math.ceil(hull.length / 28));
  const slim = hull.filter((_, index) => index % step === 0);
  if (slim.length < 4) return null;
  let bestQuad: Point[] | null = null;
  let bestArea = 0;
  for (let i = 0; i < slim.length; i += 1) {
    for (let j = i + 1; j < slim.length; j += 1) {
      for (let k = j + 1; k < slim.length; k += 1) {
        for (let l = k + 1; l < slim.length; l += 1) {
          const quad = [slim[i], slim[j], slim[k], slim[l]];
          const area = quadArea(quad);
          if (area > bestArea) {
            bestArea = area;
            bestQuad = quad;
          }
        }
      }
    }
  }
  if (!bestQuad) return null;
  const [tl, tr, br, bl] = orderQuad(bestQuad);
  return { count: bestCount, tl, tr, br, bl };
}

function solve8(rows: number[][]): number[] {
  const n = 8;
  const m = rows.map((row) => row.slice());
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    const swap = m[col];
    m[col] = m[pivot];
    m[pivot] = swap;
    const div = m[col][col];
    if (Math.abs(div) < 1e-8) throw new Error("singular homography");
    for (let c = col; c <= n; c += 1) m[col][c] /= div;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = m[row][col];
      for (let c = col; c <= n; c += 1) m[row][c] -= factor * m[col][c];
    }
  }
  return m.map((row) => row[n]);
}

/** Maps photo pixels inside the quad back onto the flat artwork. */
function homography(from: Point[], to: Point[]) {
  const rows: number[][] = [];
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = from[i];
    const { x: u, y: v } = to[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  const h = solve8(rows);
  return (x: number, y: number) => {
    const w = h[6] * x + h[7] * y + 1;
    return { x: (h[0] * x + h[1] * y + h[2]) / w, y: (h[3] * x + h[4] * y + h[5]) / w };
  };
}

function insideQuad(x: number, y: number, quad: Point[]) {
  let sign = 0;
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (Math.abs(cross) < 0.5) continue;
    const next = cross > 0 ? 1 : -1;
    if (sign === 0) sign = next;
    else if (next !== sign) return false;
  }
  return true;
}

function insetQuad(quad: Point[], amount: number): Point[] {
  const cx = quad.reduce((sum, point) => sum + point.x, 0) / quad.length;
  const cy = quad.reduce((sum, point) => sum + point.y, 0) / quad.length;
  return quad.map((point) => ({
    x: point.x + (cx - point.x) * amount,
    y: point.y + (cy - point.y) * amount
  }));
}

function sampleBilinear(src: Buffer, sw: number, sh: number, x: number, y: number) {
  if (x < 0 || y < 0 || x >= sw - 1 || y >= sh - 1) return null;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const dx = x - x0;
  const dy = y - y0;
  const out = [0, 0, 0, 0];
  for (let ky = 0; ky < 2; ky += 1) {
    for (let kx = 0; kx < 2; kx += 1) {
      const weight = (kx ? dx : 1 - dx) * (ky ? dy : 1 - dy);
      const index = ((y0 + ky) * sw + (x0 + kx)) * 4;
      for (let channel = 0; channel < 4; channel += 1) out[channel] += src[index + channel] * weight;
    }
  }
  return out;
}

async function artwork(logo: Buffer, qr: Buffer, targetW: number, targetH: number) {
  const logoMeta = await sharp(logo).metadata();
  const pad = Math.round(Math.min(targetW, targetH) * 0.06);
  const gap = Math.round(pad * 0.7);
  const landscape = targetW > targetH * 1.15;
  const layers: OverlayOptions[] = [];
  if (landscape) {
    const qrSize = Math.round(Math.min(targetH - pad * 2, targetW * 0.42));
    const logoW = Math.round(targetW - pad * 3 - qrSize);
    const logoH = Math.round(((logoMeta.height || 1) / (logoMeta.width || 1)) * logoW);
    layers.push({
      input: await sharp(logo).resize(logoW, logoH).png().toBuffer(),
      left: pad,
      top: Math.round((targetH - logoH) / 2)
    });
    layers.push({
      input: await sharp(qr).resize(qrSize, qrSize).png().toBuffer(),
      left: targetW - pad - qrSize,
      top: Math.round((targetH - qrSize) / 2)
    });
  } else {
    const logoW = Math.round((targetW - pad * 2) * 0.92);
    const logoH = Math.round(((logoMeta.height || 1) / (logoMeta.width || 1)) * logoW);
    const qrSize = Math.max(32, Math.round(Math.min(targetW - pad * 2, targetH - pad * 2 - logoH - gap) * 0.9));
    const block = logoH + gap + qrSize;
    const top = Math.max(pad, Math.round((targetH - block) / 2));
    layers.push(
      {
        input: await sharp(logo).resize(logoW, logoH).png().toBuffer(),
        left: Math.round((targetW - logoW) / 2),
        top
      },
      {
        input: await sharp(qr).resize(qrSize, qrSize).png().toBuffer(),
        left: Math.round((targetW - qrSize) / 2),
        top: top + logoH + gap
      }
    );
  }
  return sharp({
    create: { width: targetW, height: targetH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
    .composite(layers)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/** The mark is dark on a black plate. Knock the plate out so it sits on the white card. */
async function logoOnWhite() {
  const source = path.join("public", "brand", "logo-horizontal.png");
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const r = data[0];
  const g = data[1];
  const b = data[2];
  const a = data[3];
  console.log(`logo corner rgba ${r} ${g} ${b} ${a} ${info.width}x${info.height}`);
  if (channels === 4 && a > 200 && r < 30 && g < 30 && b < 30) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 12 && data[i + 1] < 12 && data[i + 2] < 12) data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function warpOnto(base: Sharp, width: number, height: number, quad: Point[], logo: Buffer, qr: Buffer) {
  const span = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const artW = Math.max(240, Math.round((span(quad[0], quad[1]) + span(quad[3], quad[2])) / 2));
  const artH = Math.max(240, Math.round((span(quad[0], quad[3]) + span(quad[1], quad[2])) / 2));
  const art = await artwork(logo, qr, artW, artH);
  const map = homography(quad, [
    { x: 0, y: 0 },
    { x: artW, y: 0 },
    { x: artW, y: artH },
    { x: 0, y: artH }
  ]);
  const overlay = Buffer.alloc(width * height * 4);
  const minX = Math.max(0, Math.floor(Math.min(...quad.map((point) => point.x))));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...quad.map((point) => point.x))));
  const minY = Math.max(0, Math.floor(Math.min(...quad.map((point) => point.y))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...quad.map((point) => point.y))));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!insideQuad(x, y, quad)) continue;
      const source = map(x + 0.5, y + 0.5);
      const pixel = sampleBilinear(art.data, art.info.width, art.info.height, source.x, source.y);
      if (!pixel) continue;
      const index = (y * width + x) * 4;
      overlay[index] = pixel[0];
      overlay[index + 1] = pixel[1];
      overlay[index + 2] = pixel[2];
      overlay[index + 3] = pixel[3];
    }
  }
  const layer = await sharp(overlay, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return base.composite([{ input: layer, left: 0, top: 0 }]).jpeg({ quality: 92 }).toBuffer();
}

async function place(file: string, logo: Buffer, qr: Buffer) {
  const oriented = sharp(file).rotate();
  const meta = await oriented.metadata();
  const fullW = meta.width || 1;
  const fullH = meta.height || 1;
  // Drop the generator mark in the bottom-right before the white card is measured.
  const width = Math.round(fullW * 0.92);
  const height = Math.round(fullH * 0.94);
  const base = sharp(file).rotate().extract({ left: 0, top: 0, width, height });
  const sampleW = 640;
  const sampleH = Math.round((height / width) * sampleW);
  const sample = await base
    .clone()
    .resize(sampleW, sampleH, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const card = largestWhite(sample.data, sample.info.width, sample.info.height, sample.info.channels);
  if (!card) {
    console.log(`${path.basename(file)} no card, centered fallback`);
    const boxW = Math.round(width * 0.34);
    const boxH = Math.round(height * 0.46);
    const fitted = await artwork(logo, qr, boxW, boxH);
    const png = await sharp(fitted.data, {
      raw: { width: fitted.info.width, height: fitted.info.height, channels: 4 }
    })
      .png()
      .toBuffer();
    return base
      .composite([{ input: png, left: Math.round(width * 0.33), top: Math.round(height * 0.2) }])
      .jpeg({ quality: 92 })
      .toBuffer();
  }
  const scaleX = width / sample.info.width;
  const scaleY = height / sample.info.height;
  const quad = insetQuad(
    [card.tl, card.tr, card.br, card.bl].map((point) => ({ x: point.x * scaleX, y: point.y * scaleY })),
    0.07
  );
  console.log(
    `${path.basename(file)} quad ${quad.map((point) => `${Math.round(point.x)},${Math.round(point.y)}`).join(" ")} n=${card.count}`
  );
  return warpOnto(base, width, height, quad, logo, qr);
}

async function writePair(image: Buffer, name: string, width: number, height: number) {
  const dir = path.join("public", "landing");
  const fitted = sharp(image).resize(width, height, { fit: "cover", position: "centre" });
  await fitted.clone().avif({ quality: 40, effort: 4 }).toFile(path.join(dir, `${name}.avif`));
  await fitted.webp({ quality: 68 }).toFile(path.join(dir, `${name}.webp`));
}

async function main() {
  const logo = await logoOnWhite();
  const qr = await QRCode.toBuffer(QR_URL, {
    errorCorrectionLevel: "M",
    margin: 0,
    width: 640,
    color: { dark: "#1C1813", light: "#FFFFFF" }
  });
  fs.mkdirSync(path.join("public", "landing", "photos"), { recursive: true });
  for (const [name, file] of Object.entries(FILES)) {
    const source = path.join(SRC, file);
    if (!fs.existsSync(source)) throw new Error(`missing stand source ${source}`);
    const composed = await place(source, logo, qr);
    await writePair(composed, `${name}-800`, 800, 600);
    await writePair(composed, `${name}-1600`, 1600, 1200);
    const size = fs.statSync(path.join("public", "landing", `${name}-800.avif`)).size;
    console.log(`${name} 800 avif ${size}`);
    if (name === "product-reviews") {
      await writePair(composed, "photos/stand-hero-640", 640, 800);
      await writePair(composed, "photos/stand-hero-1280", 1280, 1600);
      const hero = fs.statSync(path.join("public", "landing", "photos", "stand-hero-640.avif")).size;
      console.log(`stand-hero 640 avif ${hero}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
