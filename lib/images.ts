/**
 * Image URL rules shared by Zod and the upload route.
 * Object storage itself lives in lib/storage.ts so this file stays free of
 * sharp and the S3 client.
 */

const UNSAFE = /["'<>\s]/;

export type StorageEnv = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  region: string;
  forcePathStyle: boolean;
  configured: boolean;
};

export function storageConfig(env: NodeJS.ProcessEnv = process.env): StorageEnv {
  const endpoint = (env.S3_ENDPOINT || "").trim();
  const bucket = (env.S3_BUCKET || "").trim();
  const accessKeyId = (env.S3_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (env.S3_SECRET_ACCESS_KEY || "").trim();
  const publicBaseUrl = (env.S3_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
  const region = (env.S3_REGION || "auto").trim() || "auto";
  const forcePathStyle = env.S3_FORCE_PATH_STYLE !== "false";
  const configured = Boolean(
    endpoint && bucket && accessKeyId && secretAccessKey && publicBaseUrl.startsWith("https://")
  );
  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    region,
    forcePathStyle,
    configured
  };
}

export function storageConfigured(env: NodeJS.ProcessEnv = process.env) {
  return storageConfig(env).configured;
}

/** Longest side, never upscales. */
export function fittedSize(width: number, height: number, maxSide: number) {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

export function objectKeys(id: string, ext: string, now = new Date()) {
  const safeId = id.replace(/[^a-zA-Z0-9-]/g, "");
  if (!safeId) throw new Error("Invalid object id");
  const safeExt = /^(jpg|png|webp|gif|svg)$/.test(ext) ? ext : "bin";
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const prefix = `uploads/${y}/${m}/${safeId}`;
  return {
    original: `${prefix}/original.${safeExt}`,
    display: `${prefix}/display.webp`,
    thumb: `${prefix}/thumb.webp`
  };
}

export function isPublicObjectUrl(value: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const cfg = storageConfig(env);
  if (!cfg.configured || !value || UNSAFE.test(value)) return false;
  let valueUrl: URL;
  let baseUrl: URL;
  try {
    valueUrl = new URL(value);
    baseUrl = new URL(cfg.publicBaseUrl);
  } catch {
    return false;
  }
  if (valueUrl.protocol !== "https:" || valueUrl.host !== baseUrl.host) return false;
  if (valueUrl.username || valueUrl.password) return false;
  const basePath = baseUrl.pathname.replace(/\/$/, "");
  const path = valueUrl.pathname;
  if (basePath) return path.startsWith(`${basePath}/`);
  return path.startsWith("/uploads/");
}

/**
 * A value that may be saved on its own.
 * With storage configured, only an https URL on our public base.
 * Without it, an http(s) URL or a data:image URL, matching the previous form.
 */
export function storedImageAllowed(value: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!value || value.length > 1_500_000 || UNSAFE.test(value)) return false;
  if (storageConfigured(env)) return isPublicObjectUrl(value, env);
  return /^(https?:\/\/|data:image\/)/i.test(value);
}

/**
 * Drop an unchanged legacy image so a later strict check does not reject a
 * business save that did not touch the picture. A new data URL is left in
 * place and fails that check while storage is on.
 */
export function omitUnchangedImages<T extends Record<string, unknown>>(
  body: T,
  previous: Partial<Record<string, string | null | undefined>>,
  keys: readonly string[]
): T {
  if (!storageConfigured()) return body;
  const next = { ...body };
  for (const key of keys) {
    const value = next[key];
    if (typeof value !== "string" || storedImageAllowed(value)) continue;
    if (previous[key] && value === previous[key]) delete next[key];
  }
  return next;
}

export function parseDataImage(value: string): { mime: string; bytes: Buffer } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length) return null;
  return { mime: match[1].toLowerCase(), bytes };
}

export function detectRaster(bytes: Buffer): "jpg" | "png" | "webp" | "gif" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (
    bytes.length >= 6 &&
    (bytes.toString("ascii", 0, 6) === "GIF87a" || bytes.toString("ascii", 0, 6) === "GIF89a")
  ) {
    return "gif";
  }
  return null;
}
