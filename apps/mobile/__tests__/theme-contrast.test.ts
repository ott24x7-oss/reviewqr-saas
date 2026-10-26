import { APP_THEMES, CINEMATIC_ACCENTS, getThemePalette, type AppThemeName, type CinematicAccent, type Palette } from "../src/ui/tokens";

type RGB = readonly [number, number, number];

function parseColor(value: string): { rgb: RGB; alpha: number } {
  const hex = /^#([\da-f]{6})$/i.exec(value);
  if (hex) {
    const number = Number.parseInt(hex[1], 16);
    return { rgb: [(number >> 16) & 255, (number >> 8) & 255, number & 255], alpha: 1 };
  }
  const rgba = /^rgba?\(([^)]+)\)$/.exec(value);
  if (!rgba) throw new Error(`Unsupported color token: ${value}`);
  const parts = rgba[1].split(",").map((part) => Number(part.trim()));
  return { rgb: [parts[0], parts[1], parts[2]], alpha: parts[3] ?? 1 };
}

function composite(foreground: string, background: string) {
  const front = parseColor(foreground);
  const back = parseColor(background);
  const alpha = front.alpha + back.alpha * (1 - front.alpha);
  const rgb = front.rgb.map((channel, index) => {
    const behind = back.rgb[index];
    return Math.round((channel * front.alpha + behind * back.alpha * (1 - front.alpha)) / alpha);
  }) as unknown as RGB;
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(value: string) {
  const { rgb } = parseColor(value);
  const channels = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function readableAgainstSurfaces(theme: string, mode: string, palette: Palette) {
  const backgrounds = [
    palette.bg,
    composite(palette.surface, palette.bg),
    composite(palette.surface2, palette.bg),
    composite(palette.accentSoft, palette.bg)
  ];
  for (const background of backgrounds) {
    expect(contrast(palette.text, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette.muted, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette.deep, background)).toBeGreaterThanOrEqual(4.5);
  }
  for (const stop of palette.buttonGradient) {
    expect(contrast(palette.onPrimary, stop)).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(palette.onPrimary, palette.primary)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(palette.headerInk, palette.header)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(palette.onDanger, palette.danger)).toBeGreaterThanOrEqual(4.5);
  expect(theme).toBeTruthy();
  expect(mode).toBeTruthy();
}

describe("owner app theme text contrast", () => {
  const cases: { theme: AppThemeName; mode: "light" | "dark"; accent: CinematicAccent }[] = APP_THEMES.flatMap((theme) =>
    (["light", "dark"] as const).flatMap((mode) => {
      const accents: readonly CinematicAccent[] = theme === "cinematic" ? CINEMATIC_ACCENTS : ["gold"];
      return accents.map((accent) => ({ theme, mode, accent }));
    })
  );
  it.each(cases)("$theme $mode ($accent) has readable text and buttons", ({ theme, mode, accent }) => {
    readableAgainstSurfaces(theme, mode, getThemePalette(theme, mode, accent));
  });
});
