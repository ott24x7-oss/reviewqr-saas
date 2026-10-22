import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { BRAND_OUTPUTS, regenerateBrandIcons, writePlaceholderSources } from "../../scripts/brand-icons";

describe("brand icons", () => {
  it("writes every web and Android size from the two source files", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "qr24x7-brand-"));
    await writePlaceholderSources(root);
    await regenerateBrandIcons(root);

    const expected: Record<string, { width: number; height: number }> = {
      "public/brand/icon-1024.png": { width: 1024, height: 1024 },
      "public/brand/favicon-16.png": { width: 16, height: 16 },
      "public/brand/favicon-32.png": { width: 32, height: 32 },
      "public/brand/favicon-48.png": { width: 48, height: 48 },
      "public/brand/apple-touch-icon.png": { width: 180, height: 180 },
      "public/brand/icon-192.png": { width: 192, height: 192 },
      "public/brand/icon-512.png": { width: 512, height: 512 },
      "public/brand/icon-maskable-192.png": { width: 192, height: 192 },
      "public/brand/icon-maskable-512.png": { width: 512, height: 512 },
      "public/brand/og-image.png": { width: 1200, height: 630 },
      "apps/mobile/assets/icon.png": { width: 1024, height: 1024 },
      "apps/mobile/assets/adaptive-icon.png": { width: 1024, height: 1024 },
      "apps/mobile/assets/adaptive-icon-background.png": { width: 1024, height: 1024 },
      "apps/mobile/assets/splash.png": { width: 1284, height: 2778 },
      "apps/mobile/assets/notification-icon.png": { width: 96, height: 96 }
    };

    for (const relative of BRAND_OUTPUTS) {
      const file = path.join(root, ...relative.split("/"));
      expect(fs.existsSync(file), relative).toBe(true);
      expect(fs.statSync(file).size, relative).toBeGreaterThan(32);
    }

    for (const [relative, size] of Object.entries(expected)) {
      const meta = await sharp(path.join(root, ...relative.split("/"))).metadata();
      expect(meta.width, relative).toBe(size.width);
      expect(meta.height, relative).toBe(size.height);
    }

    const ico = fs.readFileSync(path.join(root, "public", "brand", "favicon.ico"));
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
    const svg = fs.readFileSync(path.join(root, "public", "brand", "logo-horizontal.svg"), "utf8");
    expect(svg).toContain("logo-horizontal.png");
    const dark = fs.readFileSync(path.join(root, "public", "brand", "logo-horizontal-dark.svg"), "utf8");
    expect(dark).toContain("logo-horizontal-dark.png");
  }, 30_000);
});
