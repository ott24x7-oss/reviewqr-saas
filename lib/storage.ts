/**
 * S3-compatible uploads (Cloudflare R2). Each image is stored as the original
 * bytes, a WebP whose longest side is at most 1200px, and a 256px WebP thumb.
 * Callers save the display URL. If the bucket env is missing, the same resize
 * is returned as a data URL so local dev keeps working.
 */
import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  detectRaster,
  objectKeys,
  storageConfig,
  storageConfigured,
  type StorageEnv
} from "./images";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;
const DATA_URL_MAX = 1_200_000;

export type ImageVariant = "logo" | "cover";

export type StoredUpload = {
  url: string;
  thumbUrl: string;
  originalUrl: string;
  storage: "s3" | "data-url";
};

let warned = false;
let client: S3Client | null = null;
let clientKey = "";

export function warnStorageMissing() {
  if (warned) return;
  warned = true;
  console.warn(
    "[storage] S3/R2 is not configured. Uploads stay as data URLs. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and an https S3_PUBLIC_BASE_URL."
  );
}

function s3(cfg: StorageEnv): S3Client {
  const key = `${cfg.endpoint}|${cfg.accessKeyId}|${cfg.region}|${cfg.forcePathStyle}`;
  if (!client || clientKey !== key) {
    client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      forcePathStyle: cfg.forcePathStyle,
      // R2 rejects the default flexible checksum headers.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED"
    });
    clientKey = key;
  }
  return client;
}

function contentType(ext: string) {
  if (ext === "jpg") return "image/jpeg";
  if (ext === "svg") return "image/svg+xml";
  return `image/${ext}`;
}

function isSvg(bytes: Buffer) {
  const head = bytes.subarray(0, 300).toString("utf8").trimStart().toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}

function assertSafeSvg(bytes: Buffer) {
  const text = bytes.toString("utf8");
  if (/<script|javascript:|on[a-z]+\s*=|<foreignObject/i.test(text)) {
    throw new Error("SVG images cannot include scripts");
  }
}

async function webpVariant(bytes: Buffer, variant: ImageVariant, maxSide: number, quality: number) {
  const meta = await sharp(bytes, {
    failOn: "error",
    limitInputPixels: MAX_PIXELS,
    animated: false
  })
    .rotate()
    .metadata();
  if (!meta.width || !meta.height) throw new Error("Could not read image");

  let img = sharp(bytes, { failOn: "error", limitInputPixels: MAX_PIXELS, animated: false }).rotate();
  if (variant === "logo") {
    const side = Math.min(meta.width, meta.height);
    img = img.extract({
      left: Math.floor((meta.width - side) / 2),
      top: Math.floor((meta.height - side) / 2),
      width: side,
      height: side
    });
  }
  return img
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

async function dataUrlFallback(bytes: Buffer, variant: ImageVariant) {
  // Logos also have to fit the platform-branding column (600KB).
  const cap = variant === "logo" ? 500_000 : DATA_URL_MAX;
  let quality = 82;
  let maxSide = variant === "logo" ? 512 : 1200;
  let last = "";
  for (let i = 0; i < 4; i++) {
    const rendered = await webpVariant(bytes, variant, maxSide, quality);
    last = `data:image/webp;base64,${rendered.toString("base64")}`;
    if (last.length <= cap) return last;
    quality = Math.max(40, quality - 12);
    maxSide = Math.max(256, Math.round(maxSide * 0.75));
  }
  if (last.length > cap) throw new Error("Image is still too large after resizing");
  return last;
}

async function putObject(cfg: StorageEnv, key: string, body: Buffer, type: string) {
  await s3(cfg).send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: type,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );
}

export async function storeUpload(opts: {
  bytes: Buffer;
  variant: ImageVariant;
}): Promise<StoredUpload> {
  if (!opts.bytes.length) throw new Error("Empty file");
  if (opts.bytes.length > MAX_INPUT_BYTES) throw new Error("Image too large (max 8MB)");

  const raster = detectRaster(opts.bytes);
  const svg = !raster && isSvg(opts.bytes);
  if (!raster && !svg) throw new Error("Upload a PNG, JPEG, or WebP image");
  if (svg) assertSafeSvg(opts.bytes);

  if (!storageConfigured()) {
    warnStorageMissing();
    if (svg) {
      const url = `data:image/svg+xml;base64,${opts.bytes.toString("base64")}`;
      if (url.length > 614_400) throw new Error("SVG logo is too large");
      return { url, thumbUrl: url, originalUrl: url, storage: "data-url" };
    }
    const url = await dataUrlFallback(opts.bytes, opts.variant);
    return { url, thumbUrl: url, originalUrl: url, storage: "data-url" };
  }

  const cfg = storageConfig();
  const id = randomUUID();
  if (svg) {
    const key = objectKeys(id, "svg").original;
    await putObject(cfg, key, opts.bytes, "image/svg+xml");
    const url = `${cfg.publicBaseUrl}/${key}`;
    return { url, thumbUrl: url, originalUrl: url, storage: "s3" };
  }

  const keys = objectKeys(id, raster!);
  const display = await webpVariant(opts.bytes, opts.variant, 1200, 82);
  const thumb = await webpVariant(opts.bytes, opts.variant, 256, 80);
  await putObject(cfg, keys.original, opts.bytes, contentType(raster!));
  await putObject(cfg, keys.display, display, "image/webp");
  await putObject(cfg, keys.thumb, thumb, "image/webp");
  return {
    url: `${cfg.publicBaseUrl}/${keys.display}`,
    thumbUrl: `${cfg.publicBaseUrl}/${keys.thumb}`,
    originalUrl: `${cfg.publicBaseUrl}/${keys.original}`,
    storage: "s3"
  };
}
