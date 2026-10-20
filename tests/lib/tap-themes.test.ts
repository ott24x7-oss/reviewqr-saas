import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { paletteFromImage } from "../../lib/tap/palette";
import { contrastRatio } from "../../lib/tap/contrast";
import { FREE_THEME_ID, THEME_PRESETS, resolveTheme, themeContrastError } from "../../lib/tap/themes";

const PREMIUM = ["peacock", "royal-indian", "diwali-gold", "neon-night", "midnight-glass", "cyber-purple"];
const diwali = THEME_PRESETS.find((theme) => theme.id === "diwali-gold")!;

function stops(value: string) {
  const withoutArt = value.replace(/url\((?:"data:image[\s\S]*?\)|'data:image[\s\S]*?\)|data:image[^)]*)\)/g, "");
  return Array.from(withoutArt.matchAll(/#[0-9a-fA-F]{6}/g), (match) => match[1] ? `#${match[1]}` : match[0]);
}

describe("tap themes", () => {
  it("ships twenty presets and six premium themes", () => {
    expect(THEME_PRESETS).toHaveLength(20);
    expect(THEME_PRESETS.filter((theme) => theme.premium).map((theme) => theme.id).sort()).toEqual([...PREMIUM].sort());
    expect(THEME_PRESETS.find((theme) => theme.id === FREE_THEME_ID)?.premium).toBe(false);
  });

  it("keeps body and button text at WCAG AA, including gradient stops", () => {
    for (const theme of THEME_PRESETS) {
      const { ink, bg, muted, buttonInk, buttonBg, background, buttonFill, buttons } = theme.tokens;
      expect(contrastRatio(ink, bg), theme.id).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(buttonInk, buttonBg), `${theme.id} button`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(muted, bg), `${theme.id} muted`).toBeGreaterThanOrEqual(4.5);
      for (const stop of stops(background)) {
        expect(contrastRatio(ink, stop), `${theme.id} ${stop}`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(muted, stop), `${theme.id} muted ${stop}`).toBeGreaterThanOrEqual(4.5);
        if (buttons === "glass") {
          expect(contrastRatio(buttonBg, stop), `${theme.id} glass ${stop}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      for (const stop of stops(buttonFill || buttonBg)) {
        expect(contrastRatio(buttonInk, stop), `${theme.id} fill ${stop}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(background).not.toMatch(/opacity=['"]0\.(?:0[8-9]|[1-9])/);
    }
  });

  it("falls back to Monochrome Luxe when a free account picks a premium theme", () => {
    const theme = resolveTheme({
      published: { theme: "dark-luxe" },
      paid: false,
      now: new Date("2026-06-01T12:00:00+05:30")
    });
    expect(theme.id).toBe(FREE_THEME_ID);
  });

  it("uses Diwali Gold inside the India date window and ignores custom colours", () => {
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
    expect(theme.id).toBe("diwali-gold");
    expect(theme.tokens.bg).toBe(diwali.tokens.bg);
    expect(theme.tokens.ink).toBe(diwali.tokens.ink);
  });

  it("keeps a free account on Monochrome Luxe during a festive window", () => {
    const theme = resolveTheme({
      published: { theme: "cafe", seasonal: { from: "2026-10-20", to: "2026-10-25" } },
      paid: false,
      now: new Date("2026-10-21T12:00:00+05:30")
    });
    expect(theme.id).toBe(FREE_THEME_ID);
  });

  it("maps a saved café theme and keeps custom colours", () => {
    const theme = resolveTheme({
      published: { theme: "cafe", customTokens: { bg: "#fff7ed", ink: "#1c1410" } },
      paid: true,
      now: new Date("2026-06-01T12:00:00+05:30")
    });
    expect(theme.id).toBe("coffee-house");
    expect(theme.tokens.bg).toBe("#fff7ed");
    expect(theme.tokens.ink).toBe("#1c1410");
  });

  it("falls back when the stored theme id is unknown", () => {
    const theme = resolveTheme({ published: { theme: "not-a-theme" }, paid: true });
    expect(theme.id).toBe(FREE_THEME_ID);
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
