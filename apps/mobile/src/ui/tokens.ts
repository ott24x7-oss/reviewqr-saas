/** Emerald Premium tokens. Light paper, dark ink surfaces. Same keys in both modes. */
export type Palette = {
  primary: string;
  deep: string;
  bright: string;
  ink: string;
  paper: string;
  card: string;
  line: string;
  muted: string;
  star: string;
  danger: string;
  white: string;
  onPrimary: string;
  inkSoft: string;
  chip: string;
  scrim: string;
  header: string;
  headerInk: string;
  success: string;
  navy: string;
  cyan: string;
  cyanSoft: string;
  glass: string;
};

export const lightPalette: Palette = {
  primary: "#16A34A",
  deep: "#0F7A37",
  bright: "#22C55E",
  ink: "#1C1813",
  paper: "#F4EFE6",
  card: "#FFFFFF",
  line: "#E7E0D4",
  muted: "#6B6358",
  star: "#D69E2E",
  danger: "#DC2626",
  white: "#FFFFFF",
  onPrimary: "#FFFFFF",
  inkSoft: "#6B6358",
  chip: "#E7E0D4",
  scrim: "rgba(28,24,19,0.55)",
  header: "#1C1813",
  headerInk: "#F4EFE6",
  success: "#0F7A37",
  navy: "#F4EFE6",
  cyan: "#16A34A",
  cyanSoft: "#0F7A37",
  glass: "rgba(255,255,255,0.72)"
};

export const darkPalette: Palette = {
  primary: "#16A34A",
  deep: "#0F7A37",
  bright: "#22C55E",
  ink: "#F4EFE6",
  paper: "#14110E",
  card: "#221E19",
  line: "#3C342C",
  muted: "#B7AB9E",
  star: "#E0B34A",
  danger: "#F87171",
  white: "#FFFFFF",
  onPrimary: "#FFFFFF",
  inkSoft: "#B7AB9E",
  chip: "#3C342C",
  scrim: "rgba(0,0,0,0.62)",
  header: "#0E0C0A",
  headerInk: "#F4EFE6",
  success: "#22C55E",
  navy: "#14110E",
  cyan: "#22C55E",
  cyanSoft: "#86EFAC",
  glass: "rgba(255,255,255,0.06)"
};

export const space = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24
} as const;

export const radius = {
  button: 16,
  card: 20,
  chip: 999,
  tile: 16
} as const;

export const type = {
  display: 28,
  title: 22,
  headline: 17,
  body: 16,
  caption: 13,
  min: 12
} as const;

export const motion = {
  fast: 150,
  base: 220,
  slow: 300,
  sheen: 900,
  count: 700,
  glow: 2400
} as const;

export const BLURHASH = "L5S6t?~q00xu00j[j[j[00ay~qof";
