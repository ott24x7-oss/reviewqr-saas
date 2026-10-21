function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance for a #rrggbb colour. */
export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  if (fg == null || bg == null) return null;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA for normal text is 4.5:1. */
export function meetsTextContrast(foreground: string, background: string, min = 4.5) {
  const ratio = contrastRatio(foreground, background);
  return ratio != null && ratio + 1e-9 >= min;
}

/** Picks the text colour that stays readable on this background. */
export function readableOn(background: string): "#111111" | "#ffffff" {
  const white = contrastRatio("#ffffff", background) ?? 0;
  const black = contrastRatio("#111111", background) ?? 0;
  return white >= black ? "#ffffff" : "#111111";
}
