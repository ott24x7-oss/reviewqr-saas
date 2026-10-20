import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { storeUpload } from "../../lib/storage";

const ENV_KEYS = [
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_BASE_URL"
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

async function png(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 20, b: 20 } }
  })
    .png()
    .toBuffer();
}

describe("storeUpload without a bucket", () => {
  it("returns a square webp data URL for a wide logo", async () => {
    for (const key of ENV_KEYS) delete process.env[key];
    const saved = await storeUpload({ bytes: await png(20, 10), variant: "logo" });
    expect(saved.storage).toBe("data-url");
    expect(saved.url.startsWith("data:image/webp;base64,")).toBe(true);
    const meta = await sharp(Buffer.from(saved.url.split(",")[1], "base64")).metadata();
    expect(meta.width).toBe(meta.height);
    expect(meta.width).toBe(10);
  });

  it("keeps a cover's aspect ratio", async () => {
    const saved = await storeUpload({ bytes: await png(20, 10), variant: "cover" });
    const meta = await sharp(Buffer.from(saved.url.split(",")[1], "base64")).metadata();
    expect(meta.width).toBe(20);
    expect(meta.height).toBe(10);
  });

  it("rejects a file that is not an image", async () => {
    await expect(storeUpload({ bytes: Buffer.from("hello"), variant: "logo" })).rejects.toThrow(
      /PNG, JPEG, or WebP/
    );
  });
});
