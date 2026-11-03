import { APP_THEMES, CINEMATIC_ACCENTS, contrastRatio, getThemePalette } from "../src/ui/tokens";

describe("strong button foreground contrast", () => {
  it.each(APP_THEMES.flatMap((theme) => (["light", "dark"] as const).map((scheme) => [theme, scheme] as const)))("meets WCAG AA for %s %s", (theme, scheme) => {
    const palette = getThemePalette(theme, scheme);
    expect(contrastRatio(palette.onPrimaryStrong, palette.primaryDeep)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.primaryOnSurface, palette.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(CINEMATIC_ACCENTS)("meets WCAG AA for cinematic %s", (accent) => {
    const palette = getThemePalette("cinematic", "dark", accent);
    expect(contrastRatio(palette.onPrimaryStrong, palette.primaryDeep)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.primaryOnSurface, palette.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
