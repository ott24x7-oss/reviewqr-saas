/** Owner app themes. Customer tap-page themes live separately. */
export const APP_THEMES = ["emerald", "rose", "ocean", "crimson", "graphite", "sand", "sage", "cinematic"] as const;
export type AppThemeName = (typeof APP_THEMES)[number];

export const CINEMATIC_ACCENTS = ["gold", "neon-teal", "magenta", "electric-blue"] as const;
export type CinematicAccent = (typeof CINEMATIC_ACCENTS)[number];

export const APP_THEME_NAMES: Record<AppThemeName, string> = {
  emerald: "Emerald",
  rose: "Rose",
  ocean: "Ocean",
  crimson: "Crimson",
  graphite: "Graphite",
  sand: "Sand",
  sage: "Sage",
  cinematic: "Cinematic ✨"
};

export type Palette = {
  primary: string;
  primaryDeep: string;
  onPrimary: string;
  accentSoft: string;
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  muted: string;
  success: string;
  warning: string;
  danger: string;
  buttonGradient: readonly [string, string];
  cinematic: boolean;
  /** Backwards-compatible aliases used by the existing screen components. */
  deep: string;
  bright: string;
  ink: string;
  paper: string;
  card: string;
  star: string;
  white: string;
  inkSoft: string;
  chip: string;
  scrim: string;
  header: string;
  headerInk: string;
  navy: string;
  cyan: string;
  cyanSoft: string;
  glass: string;
};

type PaletteSeed = Omit<Palette, "deep" | "bright" | "ink" | "paper" | "card" | "star" | "white" | "inkSoft" | "chip" | "scrim" | "header" | "headerInk" | "navy" | "cyan" | "cyanSoft" | "glass" | "cinematic"> & {
  header?: string;
  headerInk?: string;
  cinematic?: boolean;
};

function createPalette(seed: PaletteSeed): Palette {
  const header = seed.header ?? seed.primaryDeep;
  return {
    ...seed,
    cinematic: seed.cinematic ?? false,
    deep: seed.primaryDeep,
    bright: seed.buttonGradient[1],
    ink: seed.text,
    paper: seed.cinematic ? "transparent" : seed.bg,
    card: seed.surface,
    star: seed.warning,
    white: "#FFFFFF",
    inkSoft: seed.muted,
    chip: seed.surface2,
    scrim: "rgba(0,0,0,0.64)",
    header,
    headerInk: seed.headerInk ?? "#FFFFFF",
    navy: seed.surface2,
    cyan: seed.primary,
    cyanSoft: seed.accentSoft,
    glass: seed.surface
  };
}

const emeraldLight = createPalette({
  primary: "#16A34A", primaryDeep: "#166534", onPrimary: "#FFFFFF", accentSoft: "#DCFCE7",
  bg: "#F4EFE6", surface: "#FFFFFF", surface2: "#E7E0D4", line: "#D7CEC0", text: "#1C1813", muted: "#5E574F",
  success: "#0F7A37", warning: "#854D0E", danger: "#B91C1C", buttonGradient: ["#166534", "#0F7A37"]
});
const emeraldDark = createPalette({
  primary: "#22C55E", primaryDeep: "#15803D", onPrimary: "#052E16", accentSoft: "rgba(34,197,94,0.18)",
  bg: "#0E0D0B", surface: "#1A1916", surface2: "#25231F", line: "#3D3A34", text: "#F7F4EE", muted: "#B8B1A4",
  success: "#4ADE80", warning: "#FBBF24", danger: "#F87171", buttonGradient: ["#22C55E", "#4ADE80"], header: "#141310", headerInk: "#F7F4EE"
});

const themePalettes: Record<AppThemeName, { light: Palette; dark: Palette; alwaysDark?: boolean }> = {
  emerald: { light: emeraldLight, dark: emeraldDark },
  rose: {
    light: createPalette({
      primary: "#DB2777", primaryDeep: "#9D174D", onPrimary: "#FFFFFF", accentSoft: "#FCE7F3", bg: "#FFF8FB", surface: "#FFFFFF", surface2: "#FCE7F3", line: "#F2C8DC", text: "#2B1721", muted: "#65515C",
      success: "#16723A", warning: "#854D0E", danger: "#B91C1C", buttonGradient: ["#9D174D", "#BE185D"]
    }),
    dark: createPalette({
      primary: "#F472B6", primaryDeep: "#BE185D", onPrimary: "#500724", accentSoft: "rgba(244,114,182,0.18)", bg: "#120A0E", surface: "#21141A", surface2: "#2C1B23", line: "#49303B", text: "#FFF1F7", muted: "#C9B0BC",
      success: "#6EE7A0", warning: "#FBBF24", danger: "#FDA4AF", buttonGradient: ["#F472B6", "#FDA4D2"], header: "#1A0E14", headerInk: "#FFF1F7"
    })
  },
  ocean: {
    light: createPalette({
      primary: "#2563EB", primaryDeep: "#1D4ED8", onPrimary: "#FFFFFF", accentSoft: "#DBEAFE", bg: "#F5F9FF", surface: "#FFFFFF", surface2: "#E8F0FF", line: "#CFDCF4", text: "#14213A", muted: "#53627A",
      success: "#16723A", warning: "#854D0E", danger: "#B91C1C", buttonGradient: ["#1D4ED8", "#1E40AF"]
    }),
    dark: createPalette({
      primary: "#60A5FA", primaryDeep: "#2563EB", onPrimary: "#0A0F1A", accentSoft: "rgba(96,165,250,0.18)", bg: "#0A0F1A", surface: "#121A29", surface2: "#1B2638", line: "#34445C", text: "#F2F7FF", muted: "#B1C0D5",
      success: "#6EE7A0", warning: "#FBBF24", danger: "#FDA4AF", buttonGradient: ["#60A5FA", "#93C5FD"], header: "#0D1523", headerInk: "#F2F7FF"
    })
  },
  crimson: {
    light: createPalette({
      primary: "#DC2626", primaryDeep: "#B91C1C", onPrimary: "#FFFFFF", accentSoft: "#FEE2E2", bg: "#FFF8F8", surface: "#FFFFFF", surface2: "#FCE9E9", line: "#F1CCCC", text: "#2A1515", muted: "#655050",
      success: "#16723A", warning: "#854D0E", danger: "#B91C1C", buttonGradient: ["#B91C1C", "#991B1B"]
    }),
    dark: createPalette({
      primary: "#EF4444", primaryDeep: "#B91C1C", onPrimary: "#000000", accentSoft: "rgba(239,68,68,0.18)", bg: "#000000", surface: "#121212", surface2: "#1F1F1F", line: "#3D3D3D", text: "#F5F5F5", muted: "#B8B8B8",
      success: "#6EE7A0", warning: "#FBBF24", danger: "#F87171", buttonGradient: ["#EF4444", "#F87171"], header: "#080808", headerInk: "#F5F5F5"
    })
  },
  graphite: {
    light: createPalette({
      primary: "#334155", primaryDeep: "#1E293B", onPrimary: "#FFFFFF", accentSoft: "#E7EBF0", bg: "#F7F7F8", surface: "#FFFFFF", surface2: "#EAEBED", line: "#D5D8DE", text: "#17212F", muted: "#56616F",
      success: "#16723A", warning: "#854D0E", danger: "#B91C1C", buttonGradient: ["#334155", "#1E293B"]
    }),
    dark: createPalette({
      primary: "#94A3B8", primaryDeep: "#475569", onPrimary: "#0B0C0E", accentSoft: "rgba(148,163,184,0.2)", bg: "#0B0C0E", surface: "#15171B", surface2: "#202329", line: "#383C43", text: "#F3F4F6", muted: "#B8BEC8",
      success: "#6EE7A0", warning: "#FBBF24", danger: "#FDA4AF", buttonGradient: ["#94A3B8", "#CBD5E1"], header: "#111317", headerInk: "#F3F4F6"
    })
  },
  sand: {
    light: createPalette({
      primary: "#8B5E34", primaryDeep: "#6E4525", onPrimary: "#FFFFFF", accentSoft: "#EFE2D0", bg: "#F4EFE6", surface: "#FFFDF9", surface2: "#EEE3D3", line: "#DED0BD", text: "#33251A", muted: "#645344",
      success: "#28663A", warning: "#805313", danger: "#B4232F", buttonGradient: ["#8B5E34", "#6E4525"]
    }),
    dark: createPalette({
      primary: "#D6A86E", primaryDeep: "#8B5E34", onPrimary: "#14110D", accentSoft: "rgba(214,168,110,0.18)", bg: "#14110D", surface: "#211B15", surface2: "#2D251C", line: "#48392A", text: "#F8EBDD", muted: "#C4B39F",
      success: "#82CE92", warning: "#EDC46E", danger: "#F17D83", buttonGradient: ["#D6A86E", "#E8C78D"], header: "#19140F", headerInk: "#F8EBDD"
    })
  },
  sage: {
    light: createPalette({
      primary: "#4D7C0F", primaryDeep: "#3F6212", onPrimary: "#FFFFFF", accentSoft: "#E7EEDD", bg: "#F3F5F0", surface: "#FFFFFF", surface2: "#E8EDE2", line: "#D5DDCF", text: "#23291D", muted: "#58604F",
      success: "#28703D", warning: "#805313", danger: "#B4232F", buttonGradient: ["#4D7C0F", "#3F6212"]
    }),
    dark: createPalette({
      primary: "#A3C76D", primaryDeep: "#5F7D35", onPrimary: "#0D110B", accentSoft: "rgba(163,199,109,0.18)", bg: "#0D110B", surface: "#171D14", surface2: "#21291C", line: "#394331", text: "#F2F5ED", muted: "#B6C2A8",
      success: "#8BD18E", warning: "#EDC46E", danger: "#F17D83", buttonGradient: ["#A3C76D", "#C1D991"], header: "#11160F", headerInk: "#F2F5ED"
    })
  },
  cinematic: {
    light: createPalette({
      primary: "#D4AF37", primaryDeep: "#9C7A16", onPrimary: "#050507", accentSoft: "rgba(212,175,55,0.2)", bg: "#050507", surface: "rgba(255,255,255,0.06)", surface2: "rgba(255,255,255,0.1)", line: "rgba(255,255,255,0.1)", text: "#FFFFFF", muted: "#C7C7CC",
      success: "#70E6A1", warning: "#F5D06F", danger: "#FF8E91", buttonGradient: ["#D4AF37", "#F0D477"], cinematic: true, header: "#050507", headerInk: "#FFFFFF"
    }),
    dark: createPalette({
      primary: "#D4AF37", primaryDeep: "#9C7A16", onPrimary: "#050507", accentSoft: "rgba(212,175,55,0.2)", bg: "#050507", surface: "rgba(255,255,255,0.06)", surface2: "rgba(255,255,255,0.1)", line: "rgba(255,255,255,0.1)", text: "#FFFFFF", muted: "#C7C7CC",
      success: "#70E6A1", warning: "#F5D06F", danger: "#FF8E91", buttonGradient: ["#D4AF37", "#F0D477"], cinematic: true, header: "#050507", headerInk: "#FFFFFF"
    }),
    alwaysDark: true
  }
};

export const lightPalette = emeraldLight;
export const darkPalette = emeraldDark;

const cinematicAccentColors: Record<CinematicAccent, { primary: string; primaryDeep: string; onPrimary: string; soft: string; gradient: readonly [string, string] }> = {
  gold: { primary: "#D4AF37", primaryDeep: "#9C7A16", onPrimary: "#050507", soft: "rgba(212,175,55,0.2)", gradient: ["#D4AF37", "#F0D477"] },
  "neon-teal": { primary: "#2DD4BF", primaryDeep: "#0F766E", onPrimary: "#042F2E", soft: "rgba(45,212,191,0.18)", gradient: ["#2DD4BF", "#5EEAD4"] },
  magenta: { primary: "#E879F9", primaryDeep: "#A21CAF", onPrimary: "#3B0642", soft: "rgba(232,121,249,0.18)", gradient: ["#E879F9", "#F0ABFC"] },
  "electric-blue": { primary: "#60A5FA", primaryDeep: "#1D4ED8", onPrimary: "#07182D", soft: "rgba(96,165,250,0.18)", gradient: ["#60A5FA", "#93C5FD"] }
};

export const CINEMATIC_AURORA: Record<CinematicAccent, readonly [string, string, string]> = {
  gold: ["#D4AF37", "#E879F9", "#60A5FA"],
  "neon-teal": ["#2DD4BF", "#60A5FA", "#E879F9"],
  magenta: ["#E879F9", "#D4AF37", "#60A5FA"],
  "electric-blue": ["#60A5FA", "#2DD4BF", "#E879F9"]
};

export function getThemePalette(appTheme: AppThemeName, scheme: "light" | "dark", cinematicAccent: CinematicAccent = "gold"): Palette {
  const base = themePalettes[appTheme].alwaysDark ? themePalettes[appTheme].dark : themePalettes[appTheme][scheme];
  if (appTheme !== "cinematic") return base;
  const accent = cinematicAccentColors[cinematicAccent];
  return {
    ...base,
    primary: accent.primary,
    primaryDeep: accent.primaryDeep,
    deep: accent.primaryDeep,
    bright: accent.gradient[1],
    onPrimary: accent.onPrimary,
    accentSoft: accent.soft,
    cyan: accent.primary,
    cyanSoft: accent.soft,
    buttonGradient: accent.gradient
  };
}

export const space = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24 } as const;
export const radius = { button: 16, card: 20, chip: 999, tile: 16 } as const;
export const type = { display: 28, title: 22, headline: 17, body: 16, caption: 13, min: 12 } as const;
export const motion = { fast: 150, base: 220, slow: 300, sheen: 900, count: 700, glow: 2400 } as const;
export const BLURHASH = "L5S6t?~q00xu00j[j[j[00ay~qof";
