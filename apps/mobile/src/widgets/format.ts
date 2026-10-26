import { getThemePalette, type Palette } from "../ui/tokens";
import type { ColorProp } from "react-native-android-widget";

export type WidgetPalette = { bg: ColorProp; card: ColorProp; ink: ColorProp; primary: ColorProp; onPrimary: ColorProp };

export type WidgetSnapshot = {
  loggedIn: boolean;
  scans: number;
  orders: number;
  reviews: number;
  businessName: string;
  palette: WidgetPalette;
};

export type WidgetView = {
  title: string;
  scans: string;
  orders: string;
  reviews: string;
  loggedIn: boolean;
  qrLabel: string;
  signedOut: string;
  palette: WidgetPalette;
};

function defaultWidgetPalette(): WidgetPalette {
  const palette = getThemePalette("emerald", "light");
  return widgetPaletteFromPalette(palette);
}

export function widgetPaletteFromPalette(palette: Palette): WidgetPalette {
  return { bg: palette.bg as ColorProp, card: palette.card as ColorProp, ink: palette.ink as ColorProp, primary: palette.primary as ColorProp, onPrimary: palette.onPrimary as ColorProp };
}

function isWidgetColor(value: unknown): value is ColorProp {
  return typeof value === "string" && (/^#[\da-f]{3,8}$/i.test(value) || /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)$/i.test(value));
}

export const QR_DEEP_LINK = "qr24x7://qr";
export const WIDGET_CACHE_KEY = "reviewqr.widget";

export function emptySnapshot(): WidgetSnapshot {
  return { loggedIn: false, scans: 0, orders: 0, reviews: 0, businessName: "", palette: defaultWidgetPalette() };
}

export function parseSnapshot(raw: string | null): WidgetSnapshot {
  if (!raw) return emptySnapshot();
  try {
    const parsed = JSON.parse(raw) as Partial<WidgetSnapshot>;
    return {
      loggedIn: parsed.loggedIn === true,
      scans: Number.isFinite(parsed.scans) ? Math.max(0, Math.round(Number(parsed.scans))) : 0,
      orders: Number.isFinite(parsed.orders) ? Math.max(0, Math.round(Number(parsed.orders))) : 0,
      reviews: Number.isFinite(parsed.reviews) ? Math.max(0, Math.round(Number(parsed.reviews))) : 0,
      businessName: typeof parsed.businessName === "string" ? parsed.businessName.slice(0, 40) : "",
      palette: parsed.palette && typeof parsed.palette === "object"
        ? Object.fromEntries(["bg", "card", "ink", "primary", "onPrimary"].map((key) => {
          const candidate = (parsed.palette as Record<string, unknown>)[key];
          return [key, isWidgetColor(candidate) ? candidate : defaultWidgetPalette()[key as keyof WidgetPalette]];
        })) as WidgetPalette
        : defaultWidgetPalette()
    };
  } catch {
    return emptySnapshot();
  }
}

/** Cached dashboard numbers for the home-screen widgets. Logged-out copy is fixed. */
export function formatWidget(snapshot: WidgetSnapshot | null): WidgetView {
  const data = snapshot && snapshot.loggedIn ? snapshot : emptySnapshot();
  if (!data.loggedIn) {
    return {
      title: "QR24x7",
      scans: "—",
      orders: "—",
      reviews: "—",
      loggedIn: false,
      qrLabel: "My QR",
      signedOut: "Open app to sign in",
      palette: data.palette
    };
  }
  return {
    title: "QR24x7 Today",
    scans: String(data.scans),
    orders: String(data.orders),
    reviews: String(data.reviews),
    loggedIn: true,
    qrLabel: "Show my QR",
    signedOut: "",
    palette: data.palette
  };
}
