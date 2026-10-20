import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { paletteFromImage } from "../../lib/tap/palette";
import { THEME_PRESETS, resolveTheme, themeContrastError } from "../../lib/tap/themes";

const festive = THEME_PRESETS.find((theme) => theme.id === "festive")!;

describe("tap themes", () => {
  it("falls back to minimal when a free account picks a premium theme", () => {
    const theme = resolveTheme({
      published: { theme: "dark-luxe" },
      paid: false,
      now: new Date("2026-06-01T12:00:00+05:30")
    });
    expect(theme.id).toBe("minimal");
  });

  it("uses Festive inside the India date window and ignores custom colours", () => {
    const theme = resolveTheme({
      published: {
        theme: "cafe",
        seasonal: { from: "2026-10-20", to: "2026-10-25" },
        customTokens: { bg: "#000000", ink: "#ffffff" }
      },
      paid: true,
      now: new Date("2026-10-21T12:00:00+05:30")
    });
    expect(theme.festive).toBe(true);
    expect(theme.id).toBe("festive");
    expect(theme.tokens.bg).toBe(festive.tokens.bg);
  });

  it("keeps a free account on minimal during a festive window", () => {
    const theme = resolveTheme({
      published: { theme: "cafe", seasonal: { from: "2026-10-20", to: "2026-10-25" } },
      paid: false,
      now: new Date("2026-10-21T12:00:00+05:30")
    });
    expect(theme.id).toBe("minimal");
  });

  it("rejects text below 4.5:1 and accepts black on white", () => {
    expect(themeContrastError("#777777", "#888888")?.error).toMatch(/4\.5/);
    expect(themeContrastError("#111111", "#ffffff")).toBeNull();
    expect(themeContrastError("red", "#ffffff")?.error).toMatch(/hex/i);
  });

  it("reads an average colour from a solid image", async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#102033" }
    })
      .png()
      .toBuffer();
    const palette = await paletteFromImage(png);
    expect(palette.bg).toBe("#102033");
    expect(palette.ink).toBe("#ffffff");
  });
});
