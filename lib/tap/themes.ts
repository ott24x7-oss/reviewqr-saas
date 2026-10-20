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
  muted: patch.ink === "#ffffff" || patch.ink === "#f8fafc" ? "#c5cdd6" : "#5c5852",
  line: "rgba(28,27,24,0.12)",
  radius: "999px",
  font: "Inter",
  buttons: "pill",
  avatar: "circle",
  entrance: "none",
  background: patch.bg,
  ...patch
});

export const THEME_PRESETS: ThemePreset[] = [
  { id: "minimal", name: "Minimal White", premium: false, tokens: base({ bg: "#ffffff", ink: "#1c1b18", buttonBg: "#1c1b18", buttonInk: "#ffffff", background: "#ffffff" }) },
  { id: "dark-luxe", name: "Dark Luxe", premium: true, tokens: base({ bg: "#12100e", ink: "#f6f1e8", muted: "#c8bfb2", buttonBg: "#e7d3a1", buttonInk: "#12100e", font: "Playfair Display", background: "#12100e" }) },
  { id: "glass", name: "Glassmorphism", premium: false, tokens: base({ bg: "#e7eef6", ink: "#102033", buttonBg: "#102033", buttonInk: "#ffffff", buttons: "glass", background: "linear-gradient(160deg,#d7e4f2,#f7f1e8)" }) },
  { id: "cafe", name: "Café Warm", premium: false, tokens: base({ bg: "#f4efe6", ink: "#1c1813", buttonBg: "#1c1813", buttonInk: "#f4efe6", font: "Fraunces", background: "#f4efe6" }) },
  { id: "fresh", name: "Fresh Green", premium: false, tokens: base({ bg: "#f3f7f2", ink: "#163024", buttonBg: "#1f7a45", buttonInk: "#ffffff", background: "#f3f7f2" }) },
  { id: "neon", name: "Neon Night", premium: true, tokens: base({ bg: "#070b12", ink: "#e8f4f8", muted: "#93a4b5", buttonBg: "#35c8f0", buttonInk: "#070b12", background: "#070b12" }) },
  { id: "bakery", name: "Pastel Bakery", premium: false, tokens: base({ bg: "#f8efe8", ink: "#3d2c29", buttonBg: "#e7b2a4", buttonInk: "#3d2c29", font: "Fraunces", background: "#f8efe8" }) },
  { id: "salon", name: "Salon Rose", premium: false, tokens: base({ bg: "#fbf6f7", ink: "#3a2430", buttonBg: "#c46b86", buttonInk: "#ffffff", background: "#fbf6f7" }) },
  { id: "clinic", name: "Clinic Clean", premium: false, tokens: base({ bg: "#f7fbfb", ink: "#12313a", buttonBg: "#1f6f78", buttonInk: "#ffffff", buttons: "square", radius: "12px", background: "#f7fbfb" }) },
  { id: "royal", name: "Royal Indian", premium: true, tokens: base({ bg: "#1b1230", ink: "#f8f1de", muted: "#d9c9a3", buttonBg: "#c6a15b", buttonInk: "#1b1230", font: "Playfair Display", background: "#1b1230" }) },
  { id: "sunset", name: "Gradient Sunset", premium: false, tokens: base({ bg: "#fff4ec", ink: "#3a2016", buttonBg: "#e26d3d", buttonInk: "#ffffff", background: "linear-gradient(160deg,#ffe0c2,#f7c1d8)" }) },
  { id: "brutalist", name: "Bold Brutalist", premium: false, tokens: base({ bg: "#f4f1ea", ink: "#111111", buttonBg: "#111111", buttonInk: "#f4f1ea", buttons: "square", radius: "0px", font: "Hind", background: "#f4f1ea" }) },
  { id: "nature", name: "Nature", premium: false, tokens: base({ bg: "#eef3ea", ink: "#1d2a1f", buttonBg: "#3d6b45", buttonInk: "#ffffff", background: "#eef3ea" }) },
  { id: "festive", name: "Festive", premium: true, tokens: base({ bg: "#fff6e8", ink: "#3b160c", buttonBg: "#b42318", buttonInk: "#fff6e8", font: "Hind", background: "#fff6e8" }) },
  { id: "corporate", name: "Corporate", premium: false, tokens: base({ bg: "#f5f7fa", ink: "#1b2430", buttonBg: "#1d4e89", buttonInk: "#ffffff", buttons: "square", radius: "12px", font: "Inter", background: "#f5f7fa" }) }
];

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
    "--tap-button-bg": tokens.buttonBg,
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
  return [...THEME_PRESETS, ...extra].find((theme) => theme.id === id) || null;
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
  const preset = findTheme(requested, extra) || THEME_PRESETS[0];
  const allowed = !preset.premium || input.paid ? preset : THEME_PRESETS[0];
  const custom = festive ? null : (record(published?.customTokens) as ThemeCustom | null);
  const { video: customVideo, ...rest } = custom || {};
  const tokens: ThemeTokens = { ...allowed.tokens, ...rest };
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
