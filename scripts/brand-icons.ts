/**
 * Rebuild every platform icon from two source files:
 *   public/brand/source/icon-1024.png
 *   public/brand/source/logo-horizontal.png
 *
 * `npm run brand:icons` reads those files and writes the web and Android sizes.
 * `npm run brand:icons -- --placeholders` draws stand-in sources first.
 * A normal run never overwrites the sources.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const INK = { r: 7, g: 11, b: 18, alpha: 1 };
const CYAN = "#35C8F0";

export const BRAND_OUTPUTS = [
  "public/brand/logo-horizontal.png",
  "public/brand/logo-horizontal-dark.png",
  "public/brand/logo-horizontal.svg",
  "public/brand/logo-horizontal-dark.svg",
  "public/brand/icon-1024.png",
  "public/brand/favicon-16.png",
  "public/brand/favicon-32.png",
  "public/brand/favicon-48.png",
  "public/brand/favicon.ico",
  "public/brand/apple-touch-icon.png",
  "public/brand/icon-192.png",
  "public/brand/icon-512.png",
  "public/brand/icon-maskable-192.png",
  "public/brand/icon-maskable-512.png",
  "public/brand/og-image.png",
  "public/favicon.ico",
  "app/favicon.ico",
  "apps/mobile/assets/icon.png",
  "apps/mobile/assets/adaptive-icon.png",
  "apps/mobile/assets/adaptive-icon-background.png",
  "apps/mobile/assets/splash.png",
  "apps/mobile/assets/notification-icon.png"
] as const;

function sources(root: string) {
  return {
    icon: path.join(root, "public", "brand", "source", "icon-1024.png"),
    logo: path.join(root, "public", "brand", "source", "logo-horizontal.png")
  };
}

function destination(root: string, relative: string) {
  const file = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
}

async function square(input: Buffer, size: number) {
  return sharp(input).resize(size, size, { fit: "cover" }).png().toBuffer();
}

type Rgba = { r: number; g: number; b: number; alpha: number };

async function padded(input: Buffer, size: number, scale: number, background: Rgba | string) {
  const inner = Math.max(1, Math.round(size * scale));
  const glyph = await sharp(input)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const meta = await sharp(glyph).metadata();
  const left = Math.round((size - (meta.width || inner)) / 2);
  const top = Math.round((size - (meta.height || inner)) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: glyph, left, top }])
    .png()
    .toBuffer();
}

function icoFromPngs(pngs: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = Buffer.alloc(16 * pngs.length);
  let offset = 6 + entries.length;
  const parts: Buffer[] = [header, entries];
  pngs.forEach((png, index) => {
    const at = index * 16;
    entries[at] = png.size >= 256 ? 0 : png.size;
    entries[at + 1] = png.size >= 256 ? 0 : png.size;
    entries.writeUInt16LE(1, at + 4);
    entries.writeUInt16LE(32, at + 6);
    entries.writeUInt32LE(png.data.length, at + 8);
    entries.writeUInt32LE(offset, at + 12);
    offset += png.data.length;
    parts.push(png.data);
  });
  return Buffer.concat(parts);
}

async function lightenDarkInk(input: Buffer) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const max = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
    if (pixels[i + 3] > 0 && max < 48) {
      pixels[i] = 255;
      pixels[i + 1] = 255;
      pixels[i + 2] = 255;
    }
  }
  return sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function monochrome(input: Buffer, size: number) {
  const { data, info } = await sharp(input)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const corner = [data[0], data[1], data[2], data[3]];
  const pixels = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const distance =
      Math.abs(data[i] - corner[0]) +
      Math.abs(data[i + 1] - corner[1]) +
      Math.abs(data[i + 2] - corner[2]) +
      Math.abs(data[i + 3] - corner[3]);
    const on = distance > 40 ? 255 : 0;
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = on;
  }
  return sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

function svgWrap(fileName: string, width: number, height: number) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="${fileName}" width="${width}" height="${height}"/>
</svg>
`;
}

/** Stand-in art so the slots exist before the real logo is dropped in. */
export async function writePlaceholderSources(root = process.cwd()) {
  const { icon, logo } = sources(root);
  fs.mkdirSync(path.dirname(icon), { recursive: true });
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <rect width="1024" height="1024" rx="224" fill="${CYAN}"/>
    <rect x="220" y="220" width="220" height="220" rx="28" fill="#070B12"/>
    <rect x="584" y="220" width="220" height="220" rx="28" fill="#070B12"/>
    <rect x="220" y="584" width="220" height="220" rx="28" fill="#070B12"/>
    <rect x="640" y="640" width="164" height="164" rx="24" fill="#ffffff"/>
  </svg>`;
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="240">
    <rect x="0" y="48" width="144" height="144" rx="32" fill="${CYAN}"/>
    <rect x="200" y="70" width="520" height="36" rx="18" fill="#070B12"/>
    <rect x="200" y="126" width="300" height="22" rx="11" fill="#5c6b7a"/>
  </svg>`;
  await sharp(Buffer.from(iconSvg)).png().toFile(icon);
  await sharp(Buffer.from(logoSvg)).png().toFile(logo);
}

export async function regenerateBrandIcons(root = process.cwd()) {
  const { icon, logo } = sources(root);
  if (!fs.existsSync(icon) || !fs.existsSync(logo)) {
    throw new Error(
      "Add public/brand/source/icon-1024.png and public/brand/source/logo-horizontal.png, then run npm run brand:icons"
    );
  }
  const iconBuf = fs.readFileSync(icon);
  const logoBuf = fs.readFileSync(logo);
  const logoMeta = await sharp(logoBuf).metadata();
  const logoWidth = logoMeta.width || 960;
  const logoHeight = logoMeta.height || 240;

  const icon1024 = await square(iconBuf, 1024);
  const sizes = [16, 32, 48, 180, 192, 512] as const;
  const scaled = new Map<number, Buffer>();
  for (const size of sizes) scaled.set(size, await square(iconBuf, size));

  const files = new Map<string, Buffer>();
  files.set("public/brand/icon-1024.png", icon1024);
  files.set("public/brand/favicon-16.png", scaled.get(16)!);
  files.set("public/brand/favicon-32.png", scaled.get(32)!);
  files.set("public/brand/favicon-48.png", scaled.get(48)!);
  files.set("public/brand/apple-touch-icon.png", scaled.get(180)!);
  files.set("public/brand/icon-192.png", scaled.get(192)!);
  files.set("public/brand/icon-512.png", scaled.get(512)!);
  files.set("public/brand/icon-maskable-192.png", await padded(iconBuf, 192, 0.8, INK));
  files.set("public/brand/icon-maskable-512.png", await padded(iconBuf, 512, 0.8, INK));
  files.set("apps/mobile/assets/icon.png", icon1024);
  files.set("apps/mobile/assets/adaptive-icon.png", await padded(iconBuf, 1024, 0.66, { r: 0, g: 0, b: 0, alpha: 0 }));
  files.set(
    "apps/mobile/assets/adaptive-icon-background.png",
    await sharp({ create: { width: 1024, height: 1024, channels: 4, background: INK } }).png().toBuffer()
  );
  files.set("apps/mobile/assets/notification-icon.png", await monochrome(iconBuf, 96));

  const splashIcon = await sharp(iconBuf).resize(360, 360, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const splashMeta = await sharp(splashIcon).metadata();
  files.set(
    "apps/mobile/assets/splash.png",
    await sharp({ create: { width: 1284, height: 2778, channels: 4, background: INK } })
      .composite([
        {
          input: splashIcon,
          left: Math.round((1284 - (splashMeta.width || 360)) / 2),
          top: Math.round((2778 - (splashMeta.height || 360)) / 2)
        }
      ])
      .png()
      .toBuffer()
  );

  const lightLogo = await sharp(logoBuf).png().toBuffer();
  const darkLogo = await lightenDarkInk(logoBuf);
  files.set("public/brand/logo-horizontal.png", lightLogo);
  files.set("public/brand/logo-horizontal-dark.png", darkLogo);

  const fittedLogo = await sharp(lightLogo).resize({ width: 860, height: 280, fit: "inside" }).png().toBuffer();
  const fittedIcon = await sharp(icon1024).resize(200, 200).png().toBuffer();
  const fittedLogoMeta = await sharp(fittedLogo).metadata();
  const logoLeft = 280;
  const logoTop = Math.round((630 - (fittedLogoMeta.height || 200)) / 2);
  files.set(
    "public/brand/og-image.png",
    await sharp({ create: { width: 1200, height: 630, channels: 4, background: INK } })
      .composite([
        { input: fittedIcon, left: 48, top: 215 },
        { input: fittedLogo, left: logoLeft, top: logoTop }
      ])
      .png()
      .toBuffer()
  );

  const ico = icoFromPngs([
    { size: 16, data: scaled.get(16)! },
    { size: 32, data: scaled.get(32)! },
    { size: 48, data: scaled.get(48)! }
  ]);
  files.set("public/brand/favicon.ico", ico);
  files.set("public/favicon.ico", ico);
  files.set("app/favicon.ico", ico);

  for (const [relative, data] of files) {
    await fs.promises.writeFile(destination(root, relative), data);
  }
  await fs.promises.writeFile(
    destination(root, "public/brand/logo-horizontal.svg"),
    svgWrap("logo-horizontal.png", logoWidth, logoHeight)
  );
  await fs.promises.writeFile(
    destination(root, "public/brand/logo-horizontal-dark.svg"),
    svgWrap("logo-horizontal-dark.png", logoWidth, logoHeight)
  );
}

async function main() {
  const root = process.cwd();
  if (process.argv.includes("--placeholders")) await writePlaceholderSources(root);
  await regenerateBrandIcons(root);
}

const entry = process.argv[1]?.replace(/\\/g, "/") || "";
if (entry.endsWith("scripts/brand-icons.ts") || entry.endsWith("scripts/brand-icons.js")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
