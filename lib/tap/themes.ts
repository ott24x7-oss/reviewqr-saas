import { meetsTextContrast, readableOn } from "./contrast";
import { safeTapUrl } from "./urls";

export const THEME_FONTS = [
  "Inter",
  "Poppins",
  "Mukta",
  "Noto Sans Devanagari",
  "Playfair Display",
  "Hind",
  "Fraunces"
] as const;

export type ThemeFont = (typeof THEME_FONTS)[number];
export type ButtonStyle = "filled" | "outline" | "soft" | "glass" | "pill" | "square" | "raised";
export type AvatarShape = "circle" | "rounded" | "square";
export type Entrance = "none" | "fade" | "rise";

export type ThemeTokens = {
  bg: string;
  ink: string;
  muted: string;
  line: string;
  buttonBg: string;
  buttonInk: string;
  /** Optional gradient painted on filled buttons. Absent means the solid buttonBg. */
  buttonFill?: string;
  radius: string;
  font: ThemeFont;
  buttons: ButtonStyle;
  avatar: AvatarShape;
  entrance: Entrance;
  background: string;
};

export type ThemePreset = {
  id: string;
  name: string;
  premium: boolean;
  tokens: ThemeTokens;
};

const base = (patch: Partial<ThemeTokens> & Pick<ThemeTokens, "bg" | "ink" | "buttonBg" | "buttonInk">): ThemeTokens => ({
  muted: patch.ink,
  line: "rgba(28,27,24,0.12)",
  radius: "999px",
  font: "Inter",
  buttons: "pill",
  avatar: "circle",
  entrance: "none",
  background: patch.bg,
  ...patch
});

/** Faint film grain. Opacity stays under 0.08 so it is not a text surface. */
function grain(opacity = 0.05) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='${opacity}'/></svg>`;
  return `url("data:image/svg+xml,${svg}")`;
}

const dots = (color: string, size = 16) =>
  `radial-gradient(${color} 1px, transparent 1.2px) 0 0 / ${size}px ${size}px`;

const art = (...layers: string[]) => layers.join(",");

const fill = (from: string, to: string) => `linear-gradient(160deg, ${from}, ${to})`;

export const FREE_THEME_ID = "monochrome-luxe";

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "sunset-mango",
    name: "Sunset Mango",
    premium: false,
    tokens: base({
      bg: "#fff1e4",
      ink: "#3a2016",
      muted: "#5c4033",
      buttonBg: "#9a3412",
      buttonInk: "#fffaf5",
      buttonFill: fill("#9a3412", "#c2410c"),
      font: "Fraunces",
      background: art(
        grain(0.05),
        "radial-gradient(90% 70% at 0% 0%, #ffd7a8, transparent 58%)",
        "radial-gradient(80% 70% at 100% 100%, #ffb4a2, transparent 55%)",
        "linear-gradient(165deg, #fff1e4, #ffd0a8 52%, #f7b7a3)"
      )
    })
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    premium: false,
    tokens: base({
      bg: "#e0f2fe",
      ink: "#082f49",
      muted: "#334155",
      buttonBg: "#0c4a6e",
      buttonInk: "#f8fafc",
      buttons: "glass",
      line: "rgba(8,47,73,0.16)",
      background: art(
        dots("rgba(8,47,73,0.16)", 18),
        "radial-gradient(80% 60% at 80% 0%, #bae6fd, transparent 60%)",
        "radial-gradient(70% 60% at 0% 100%, #cffafe, transparent 55%)",
        "linear-gradient(180deg, #e0f2fe, #dbeafe 55%, #e0e7ff)"
      )
    })
  },
  {
    id: "aurora",
    name: "Aurora",
    premium: false,
    tokens: base({
      bg: "#e8fff4",
      ink: "#142033",
      muted: "#334155",
      buttonBg: "#0f766e",
      buttonInk: "#f8fafc",
      buttonFill: fill("#0f766e", "#115e59"),
      font: "Poppins",
      background: art(
        "radial-gradient(60% 50% at 10% 20%, #d9fbe8, transparent 60%)",
        "radial-gradient(55% 50% at 90% 10%, #e0e7ff, transparent 58%)",
        "radial-gradient(70% 55% at 70% 100%, #f5e8ff, transparent 60%)",
        "linear-gradient(160deg, #e8fff4, #c7f9e4)"
      )
    })
  },
  {
    id: "peacock",
    name: "Peacock",
    premium: true,
    tokens: base({
      bg: "#ccfbf1",
      ink: "#042f2e",
      muted: "#134e4a",
      buttonBg: "#115e59",
      buttonInk: "#f0fdfa",
      buttonFill: fill("#115e59", "#0f766e"),
      font: "Playfair Display",
      background: art(
        "repeating-radial-gradient(circle at 50% 0%, rgba(15,118,110,0.28) 0 1px, transparent 1px 14px)",
        "radial-gradient(80% 60% at 100% 100%, #5eead4, transparent 55%)",
        "linear-gradient(165deg, #ccfbf1, #99f6e4 40%, #a7f3d0 72%, #d1fae5)"
      )
    })
  },
  {
    id: "royal-indian",
    name: "Royal Indian",
    premium: true,
    tokens: base({
      bg: "#2a0f18",
      ink: "#f8f1de",
      muted: "#e7d3a1",
      line: "rgba(248,241,222,0.2)",
      buttonBg: "#e7d3a1",
      buttonInk: "#1b1230",
      buttonFill: fill("#e7d3a1", "#f3e6c4"),
      font: "Playfair Display",
      background: art(
        grain(0.06),
        "repeating-radial-gradient(circle at 50% 12%, rgba(231,211,161,0.55) 0 1px, transparent 1px 16px)",
        "radial-gradient(70% 50% at 50% 100%, #4a1028, transparent 62%)",
        "linear-gradient(180deg, #1a0a12, #2a0f18 45%, #5b1a2a)"
      )
    })
  },
  {
    id: "diwali-gold",
    name: "Diwali Gold",
    premium: true,
    tokens: base({
      bg: "#fff6e0",
      ink: "#3b160c",
      muted: "#7c4a32",
      buttonBg: "#f6d98a",
      buttonInk: "#3b160c",
      buttonFill: fill("#f6d98a", "#e7c56a"),
      font: "Hind",
      background: art(
        grain(0.05),
        "radial-gradient(50% 40% at 50% 0%, #ffe08a, transparent 70%)",
        "radial-gradient(40% 30% at 80% 80%, #ffd166, transparent 70%)",
        "linear-gradient(180deg, #fff6e0, #f8e1b0 60%, #ffe8c2)"
      )
    })
  },
  {
    id: "holi-splash",
    name: "Holi Splash",
    premium: false,
    tokens: base({
      bg: "#ffe4f3",
      ink: "#2a1030",
      muted: "#5b3a63",
      buttonBg: "#6b21a8",
      buttonInk: "#fff7fb",
      buttonFill: fill("#6b21a8", "#7e22ce"),
      font: "Poppins",
      background: art(
        "radial-gradient(45% 40% at 0% 0%, #fecdd3, transparent 70%)",
        "radial-gradient(40% 40% at 100% 15%, #fde68a, transparent 68%)",
        "radial-gradient(50% 45% at 80% 100%, #ddd6fe, transparent 70%)",
        "radial-gradient(40% 35% at 10% 90%, #bfdbfe, transparent 70%)",
        "linear-gradient(160deg, #ffe4f3, #fecdd3)"
      )
    })
  },
  {
    id: "neon-night",
    name: "Neon Night",
    premium: true,
    tokens: base({
      bg: "#070b12",
      ink: "#e8f7ff",
      muted: "#b6c6d4",
      line: "rgba(232,247,255,0.18)",
      buttonBg: "#67e8f9",
      buttonInk: "#070b12",
      buttonFill: fill("#67e8f9", "#22d3ee"),
      background: art(
        "radial-gradient(60% 40% at 50% 100%, #1e1b4b, transparent 70%)",
        "radial-gradient(40% 30% at 80% 10%, rgba(34,211,238,0.35), transparent 60%)",
        "linear-gradient(180deg, #070b12, #0b1220 40%, #111827 75%, #0f172a)"
      )
    })
  },
  {
    id: "midnight-glass",
    name: "Midnight Glass",
    premium: true,
    tokens: base({
      bg: "#0c1018",
      ink: "#f6f1e8",
      muted: "#d9c9a3",
      line: "rgba(246,241,232,0.16)",
      buttonBg: "#e7d3a1",
      buttonInk: "#1a140c",
      buttons: "glass",
      font: "Playfair Display",
      background: art(
        grain(0.06),
        "radial-gradient(70% 45% at 50% 0%, rgba(231,211,161,0.22), transparent 60%)",
        "linear-gradient(180deg, #0c1018, #151b28 45%, #1c2433 80%, #111827)"
      )
    })
  },
  {
    id: "cyber-purple",
    name: "Cyber Purple",
    premium: true,
    tokens: base({
      bg: "#1e1033",
      ink: "#f5f3ff",
      muted: "#ddd6fe",
      line: "rgba(245,243,255,0.18)",
      buttonBg: "#c4b5fd",
      buttonInk: "#1e1033",
      buttonFill: fill("#c4b5fd", "#ddd6fe"),
      font: "Poppins",
      background: art(
        "radial-gradient(50% 40% at 0% 100%, #3b0764, transparent 65%)",
        "radial-gradient(45% 35% at 100% 0%, #312e81, transparent 62%)",
        "linear-gradient(160deg, #1e1033, #2e1065 50%, #1e1b4b)"
      )
    })
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    premium: false,
    tokens: base({
      bg: "#fff1f2",
      ink: "#3a2430",
      muted: "#7a4a5c",
      buttonBg: "#9f1239",
      buttonInk: "#fff1f2",
      buttonFill: fill("#9f1239", "#881337"),
      font: "Fraunces",
      background: art(
        grain(0.045),
        "radial-gradient(70% 55% at 100% 0%, #fbcfe8, transparent 60%)",
        "radial-gradient(60% 50% at 0% 100%, #fecdd3, transparent 58%)",
        "linear-gradient(165deg, #fff1f2, #ffe4e6 45%, #fce7f3)"
      )
    })
  },
  {
    id: "saffron",
    name: "Saffron",
    premium: false,
    tokens: base({
      bg: "#fff7ed",
      ink: "#3b160c",
      muted: "#7c4a32",
      buttonBg: "#9a3412",
      buttonInk: "#fff7ed",
      buttonFill: fill("#9a3412", "#7c2d12"),
      font: "Hind",
      background: art(
        "repeating-linear-gradient(180deg, transparent 0 14px, rgba(154,52,18,0.08) 14px 16px)",
        "radial-gradient(80% 50% at 50% 0%, #ffe8c2, transparent 65%)",
        "linear-gradient(180deg, #fff7ed, #ffedd5 55%, #fed7aa)"
      )
    })
  },
  {
    id: "lavender-dream",
    name: "Lavender Dream",
    premium: false,
    tokens: base({
      bg: "#f5f3ff",
      ink: "#2e1065",
      muted: "#5b4b8a",
      buttonBg: "#5b21b6",
      buttonInk: "#f5f3ff",
      buttonFill: fill("#5b21b6", "#4c1d95"),
      font: "Fraunces",
      background: art(
        dots("rgba(46,16,101,0.14)", 18),
        "radial-gradient(70% 55% at 0% 100%, #e9d5ff, transparent 62%)",
        "radial-gradient(60% 45% at 100% 0%, #fae8ff, transparent 60%)",
        "linear-gradient(165deg, #f5f3ff, #ede9fe 50%, #ddd6fe)"
      )
    })
  },
  {
    id: "matcha",
    name: "Matcha",
    premium: false,
    tokens: base({
      bg: "#f0fdf4",
      ink: "#14291a",
      muted: "#3f6212",
      buttonBg: "#14532d",
      buttonInk: "#f0fdf4",
      buttonFill: fill("#14532d", "#166534"),
      font: "Mukta",
      background: art(
        dots("rgba(20,41,26,0.14)", 16),
        "radial-gradient(80% 60% at 100% 100%, #d9f99d, transparent 60%)",
        "linear-gradient(180deg, #f0fdf4, #dcfce7 50%, #bbf7d0)"
      )
    })
  },
  {
    id: "mint-fresh",
    name: "Mint Fresh",
    premium: false,
    tokens: base({
      bg: "#f0fdfa",
      ink: "#042f2e",
      muted: "#115e59",
      buttonBg: "#115e59",
      buttonInk: "#f0fdfa",
      buttonFill: fill("#115e59", "#0f766e"),
      background: art(
        dots("rgba(4,47,46,0.12)", 18),
        "radial-gradient(70% 50% at 0% 0%, #a7f3d0, transparent 62%)",
        "linear-gradient(180deg, #f0fdfa, #ccfbf1 48%, #d1fae5 80%, #ecfeff)"
      )
    })
  },
  {
    id: "coffee-house",
    name: "Coffee House",
    premium: false,
    tokens: base({
      bg: "#f5efe6",
      ink: "#1c1410",
      muted: "#6b5344",
      buttonBg: "#3f2a22",
      buttonInk: "#f5efe6",
      buttonFill: fill("#3f2a22", "#5c3d2e"),
      font: "Fraunces",
      background: art(
        grain(0.05),
        "radial-gradient(80% 55% at 50% 100%, #e7d3c1, transparent 62%)",
        "linear-gradient(180deg, #f5efe6, #efe2d2 45%, #f3e6d6 75%, #e8d5c4)"
      )
    })
  },
  {
    id: "beach-day",
    name: "Beach Day",
    premium: false,
    tokens: base({
      bg: "#fff7ed",
      ink: "#1c3348",
      muted: "#3f5870",
      buttonBg: "#075985",
      buttonInk: "#f0f9ff",
      buttonFill: fill("#075985", "#0c4a6e"),
      font: "Poppins",
      background: art(
        "repeating-linear-gradient(180deg, transparent 0 16px, rgba(14,116,144,0.1) 16px 18px)",
        "radial-gradient(80% 40% at 50% 100%, #fde68a, transparent 70%)",
        "linear-gradient(180deg, #e0f2fe, #bae6fd 42%, #fffbeb 72%, #fff7ed)"
      )
    })
  },
  {
    id: "forest",
    name: "Forest",
    premium: false,
    tokens: base({
      bg: "#14291a",
      ink: "#f3f7f1",
      muted: "#d1e7d4",
      line: "rgba(243,247,241,0.16)",
      buttonBg: "#86efac",
      buttonInk: "#14291a",
      buttonFill: fill("#86efac", "#bbf7d0"),
      font: "Hind",
      background: art(
        dots("rgba(243,247,241,0.14)", 18),
        "radial-gradient(60% 40% at 20% 0%, #234232, transparent 65%)",
        "linear-gradient(180deg, #0f2419, #14291a 40%, #1a3324 75%, #1f3d2b)"
      )
    })
  },
  {
    id: "candy-pop",
    name: "Candy Pop",
    premium: false,
    tokens: base({
      bg: "#fff1f2",
      ink: "#3b0764",
      muted: "#6b3a78",
      buttonBg: "#86198f",
      buttonInk: "#fdf4ff",
      buttonFill: fill("#86198f", "#701a75"),
      font: "Poppins",
      background: art(
        "radial-gradient(40% 35% at 0% 0%, #fae8ff, transparent 70%)",
        "radial-gradient(40% 35% at 100% 20%, #e0f2fe, transparent 68%)",
        "radial-gradient(45% 35% at 70% 100%, #fef9c3, transparent 70%)",
        "linear-gradient(160deg, #fff1f2, #fce7f3)"
      )
    })
  },
  {
    id: "monochrome-luxe",
    name: "Monochrome Luxe",
    premium: false,
    tokens: base({
      bg: "#f4f1ea",
      ink: "#1c1b18",
      muted: "#5c5852",
      buttonBg: "#1c1b18",
      buttonInk: "#f4f1ea",
      buttonFill: fill("#1c1b18", "#292824"),
      background: art(grain(0.05), "linear-gradient(180deg, #f7f4ee, #f4f1ea 40%, #efeae2 70%, #e7e2d8)")
    })
  }
];

const LEGACY_THEME_IDS: Record<string, string> = {
  minimal: FREE_THEME_ID,
  brutalist: FREE_THEME_ID,
  "dark-luxe": "midnight-glass",
  glass: "midnight-glass",
  cafe: "coffee-house",
  fresh: "matcha",
  neon: "neon-night",
  bakery: "candy-pop",
  salon: "rose-gold",
  clinic: "mint-fresh",
  royal: "royal-indian",
  sunset: "sunset-mango",
  nature: "forest",
  festive: "diwali-gold",
  corporate: "ocean-breeze"
};

export function canonicalThemeId(id: string) {
  const key = id.trim().toLowerCase();
  return LEGACY_THEME_IDS[key] || key;
}

export function freeTheme() {
  return THEME_PRESETS.find((theme) => theme.id === FREE_THEME_ID) || THEME_PRESETS[0];
}

export function fontFamily(font: string) {
  const stacks: Record<string, string> = {
    Inter: "var(--font-inter), sans-serif",
    Poppins: "var(--font-display), sans-serif",
    Mukta: "var(--font-mukta), sans-serif",
    "Noto Sans Devanagari": "var(--font-noto-deva), sans-serif",
    "Playfair Display": "var(--font-playfair), serif",
    Hind: "var(--font-hind), sans-serif",
    Fraunces: "var(--font-fraunces), serif"
  };
  return stacks[font] || stacks.Inter;
}

export function tokensToStyle(tokens: ThemeTokens): Record<string, string> {
  return {
    "--marketing-bg": tokens.bg,
    "--marketing-ink": tokens.ink,
    "--marketing-muted": tokens.muted,
    "--marketing-line": tokens.line,
    "--tap-button-bg": tokens.buttonFill || tokens.buttonBg,
    // Solid accent for tints (color-mix cannot take a gradient).
    "--tap-accent-solid": tokens.buttonBg,
    "--tap-button-ink": tokens.buttonInk,
    "--tap-radius": tokens.buttons === "pill" ? "999px" : tokens.radius,
    "--tap-font": fontFamily(tokens.font),
    background: tokens.background
  };
}

export type ThemeCustom = {
  bg?: string;
  ink?: string;
  muted?: string;
  buttonBg?: string;
  buttonInk?: string;
  radius?: string;
  font?: ThemeFont;
  buttons?: ButtonStyle;
  avatar?: AvatarShape;
  entrance?: Entrance;
  background?: string;
  buttonFill?: string | null;
  video?: string | null;
};

type Seasonal = { from?: string; to?: string } | null;

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function inFestiveWindow(seasonal: Seasonal, now: Date) {
  if (!seasonal?.from || !seasonal?.to) return false;
  const from = Date.parse(`${seasonal.from}T00:00:00+05:30`);
  const to = Date.parse(`${seasonal.to}T23:59:59+05:30`);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return false;
  const time = now.getTime();
  return time >= from && time <= to;
}

export function findTheme(id: string, extra: ThemePreset[] = []) {
  const canonical = canonicalThemeId(id);
  return [...THEME_PRESETS, ...extra].find((theme) => theme.id === canonical) || null;
}

export function resolveTheme(input: {
  published: unknown;
  paid: boolean;
  now?: Date;
  extra?: ThemePreset[];
}) {
  const published = record(input.published);
  const extra = input.extra || [];
  const seasonal = record(published?.seasonal) as Seasonal;
  const festive = inFestiveWindow(seasonal, input.now || new Date());
  const requested = festive ? "festive" : String(published?.theme || "minimal");
  const fallback = freeTheme();
  const preset = findTheme(requested, extra) || fallback;
  const allowed = !preset.premium || input.paid ? preset : fallback;
  const custom = festive ? null : (record(published?.customTokens) as ThemeCustom | null);
  const { video: customVideo, buttonFill, ...rest } = custom || {};
  const tokens: ThemeTokens = { ...allowed.tokens, ...rest };
  if (custom) {
    if (typeof buttonFill === "string") tokens.buttonFill = buttonFill;
    else delete tokens.buttonFill;
  }
  if (!THEME_FONTS.includes(tokens.font)) tokens.font = "Inter";
  const video = customVideo && safeTapUrl(customVideo, "https") ? customVideo : null;
  return { id: allowed.id, tokens, video, festive };
}

/** Returns an error message when body text would fail WCAG AA. */
export function themeContrastError(bg: string, ink: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(bg) || !/^#[0-9a-fA-F]{6}$/.test(ink)) {
    return { error: "Use 6-digit hex colours", suggested: "#111111" };
  }
  if (meetsTextContrast(ink, bg)) return null;
  return { error: "Text contrast is below 4.5:1", suggested: readableOn(bg) };
}

export function buildBackground(input: {
  type?: string;
  bg: string;
  to?: string;
  imageUrl?: string;
}) {
  if (input.type === "gradient" && input.to && /^#[0-9a-fA-F]{6}$/.test(input.to)) {
    return `linear-gradient(160deg, ${input.bg}, ${input.to})`;
  }
  if (input.type === "pattern") {
    return `repeating-linear-gradient(135deg, ${input.bg}, ${input.bg} 12px, rgba(255,255,255,0.35) 12px, rgba(255,255,255,0.35) 24px)`;
  }
  if (input.type === "image" && input.imageUrl) {
    const url = safeTapUrl(input.imageUrl, "https");
    if (!url) return input.bg;
    return `center / cover no-repeat url("${url}")`;
  }
  return input.bg;
}
