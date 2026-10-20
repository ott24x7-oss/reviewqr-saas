import { afterEach, describe, expect, it } from "vitest";
import {
  fittedSize,
  isPublicObjectUrl,
  objectKeys,
  omitUnchangedImages,
  parseDataImage,
  storageConfigured,
  storedImageAllowed
} from "../../lib/images";

const ENV_KEYS = [
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_BASE_URL"
] as const;

const saved: Record<string, string | undefined> = {};

function rememberEnv() {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

function enableStorage(base = "https://cdn.example.com/bucket") {
  process.env.S3_ENDPOINT = "https://acct.r2.cloudflarestorage.com";
  process.env.S3_BUCKET = "reviewqr";
  process.env.S3_ACCESS_KEY_ID = "key";
  process.env.S3_SECRET_ACCESS_KEY = "secret";
  process.env.S3_PUBLIC_BASE_URL = base;
}

describe("image storage rules", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("treats missing or non-https config as off", () => {
    rememberEnv();
    for (const key of ENV_KEYS) delete process.env[key];
    expect(storageConfigured()).toBe(false);
    process.env.S3_ENDPOINT = "https://acct.r2.cloudflarestorage.com";
    process.env.S3_BUCKET = "reviewqr";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_PUBLIC_BASE_URL = "http://cdn.example.com";
    expect(storageConfigured()).toBe(false);
  });

  it("fits the longest side and does not upscale", () => {
    expect(fittedSize(2000, 1000, 1200)).toEqual({ width: 1200, height: 600 });
    expect(fittedSize(80, 40, 256)).toEqual({ width: 80, height: 40 });
  });

  it("builds object keys under uploads/", () => {
    const keys = objectKeys("abc-123", "png", new Date("2026-10-20T00:00:00Z"));
    expect(keys.original).toBe("uploads/2026/10/abc-123/original.png");
    expect(keys.display).toBe("uploads/2026/10/abc-123/display.webp");
    expect(keys.thumb).toBe("uploads/2026/10/abc-123/thumb.webp");
    expect(objectKeys("../etc", "png", new Date("2026-10-20T00:00:00Z")).original).toBe(
      "uploads/2026/10/etc/original.png"
    );
  });

  it("accepts only our https base once storage is on", () => {
    rememberEnv();
    enableStorage();
    const good = "https://cdn.example.com/bucket/uploads/2026/10/a/display.webp";
    expect(isPublicObjectUrl(good)).toBe(true);
    expect(storedImageAllowed(good)).toBe(true);
    expect(storedImageAllowed("data:image/png;base64,aaaa")).toBe(false);
    expect(isPublicObjectUrl("https://cdn.example.com/bucket-evil/uploads/a.webp")).toBe(false);
    expect(isPublicObjectUrl("https://cdn.example.com.evil.com/bucket/uploads/a.webp")).toBe(false);
    expect(isPublicObjectUrl("https://user:pass@cdn.example.com/bucket/uploads/a.webp")).toBe(false);
  });

  it("keeps data URLs allowed when storage is off", () => {
    rememberEnv();
    for (const key of ENV_KEYS) delete process.env[key];
    expect(storedImageAllowed("data:image/webp;base64,aaaa")).toBe(true);
    expect(storedImageAllowed("https://images.example.com/logo.png")).toBe(true);
    expect(storedImageAllowed("javascript:alert(1)")).toBe(false);
  });

  it("drops an unchanged legacy image and keeps a new data URL for rejection", () => {
    rememberEnv();
    enableStorage();
    const legacy = "data:image/png;base64,aaaa";
    const body = omitUnchangedImages(
      { name: "Cafe", logo: legacy, coverImage: "data:image/png;base64,bbbb" },
      { logo: legacy, coverImage: null },
      ["logo", "coverImage"]
    );
    expect(body.logo).toBeUndefined();
    expect(body.coverImage).toBe("data:image/png;base64,bbbb");
    expect(body.name).toBe("Cafe");
  });

  it("parses a base64 data image", () => {
    const parsed = parseDataImage("data:image/png;base64,YQ==");
    expect(parsed?.mime).toBe("image/png");
    expect(parsed?.bytes.toString()).toBe("a");
    expect(parseDataImage("https://cdn.example.com/a.png")).toBeNull();
  });
});
