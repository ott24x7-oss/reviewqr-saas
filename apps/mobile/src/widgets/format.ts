export type WidgetSnapshot = {
  loggedIn: boolean;
  scans: number;
  orders: number;
  reviews: number;
  businessName: string;
};

export type WidgetView = {
  title: string;
  scans: string;
  orders: string;
  reviews: string;
  loggedIn: boolean;
  qrLabel: string;
  signedOut: string;
};

export const QR_DEEP_LINK = "qr24x7://qr";
export const WIDGET_CACHE_KEY = "reviewqr.widget";

export function emptySnapshot(): WidgetSnapshot {
  return { loggedIn: false, scans: 0, orders: 0, reviews: 0, businessName: "" };
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
      businessName: typeof parsed.businessName === "string" ? parsed.businessName.slice(0, 40) : ""
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
      signedOut: "Open app to sign in"
    };
  }
  return {
    title: "QR24x7 Today",
    scans: String(data.scans),
    orders: String(data.orders),
    reviews: String(data.reviews),
    loggedIn: true,
    qrLabel: "Show my QR",
    signedOut: ""
  };
}
