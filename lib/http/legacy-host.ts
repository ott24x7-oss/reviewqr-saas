/**
 * Hosts in LEGACY_HOSTS still receive already-printed QR and NFC links.
 * Every other request 301s to the same path on NEXT_PUBLIC_APP_URL.
 * Scan routes, public slug pages, and the APIs those pages call stay put
 * so a printed code can record the scan before any redirect.
 */

const RESERVED_FIRST = new Set([
  "about",
  "account",
  "admin",
  "api",
  "demo",
  "features",
  "forgot-password",
  "health",
  "how-it-works",
  "invite",
  "join",
  "login",
  "dashboard",
  "monitoring",
  "o",
  "orders",
  "plans",
  "pricing",
  "privacy",
  "q",
  "r",
  "refer",
  "refund",
  "register",
  "reset-password",
  "robots",
  "sitemap",
  "t",
  "terms",
  "widget",
  "favicon",
  "_next"
]);

export type LegacyHostInput = {
  pathname: string;
  search: string;
  host: string | null;
  appUrl: string | null;
  legacyHosts: string | null;
};

function hostnameOf(host: string) {
  const value = host.trim().toLowerCase();
  if (!value) return "";
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end >= 0 ? value.slice(1, end) : value;
  }
  return value.split(":")[0] || "";
}

export function legacyHostnames(raw: string | null | undefined) {
  return (raw || "")
    .split(",")
    .map((item) => hostnameOf(item))
    .filter(Boolean);
}

/** True when this path must keep working on a legacy host. */
export function staysOnLegacyHost(pathname: string) {
  const path = pathname.split("?")[0]?.split("#")[0] || "/";
  const bare = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  if (/^\/(?:q|t)\/[^/]+(?:\/(?:menu|contact))?$/.test(bare)) return true;
  if (/^\/r\/[^/]+$/.test(bare)) return true;
  if (bare === "/api/health" || bare.startsWith("/api/health/")) return true;
  if (bare === "/api/public" || bare.startsWith("/api/public/")) return true;
  if (bare === "/api/widget" || bare.startsWith("/api/widget/")) return true;
  const slug = bare.match(/^\/([^/]+)(?:\/(store|contact))?$/);
  if (!slug) return false;
  return !RESERVED_FIRST.has(slug[1].toLowerCase());
}

/**
 * Absolute URL for a 301, or null when the request should be served here.
 * A printed scan path returns null even on a legacy host.
 */
export function legacyHostRedirect(input: LegacyHostInput): string | null {
  if (!input.host || !input.appUrl) return null;
  if (staysOnLegacyHost(input.pathname)) return null;

  let app: URL;
  try {
    app = new URL(input.appUrl);
  } catch {
    return null;
  }
  if (app.protocol !== "http:" && app.protocol !== "https:") return null;

  const requestHost = hostnameOf(input.host.split(",")[0] || "");
  if (!requestHost) return null;
  const names = legacyHostnames(input.legacyHosts);
  if (!names.includes(requestHost)) return null;
  if (requestHost === app.hostname.toLowerCase()) return null;

  const path = input.pathname.startsWith("/") ? input.pathname : `/${input.pathname}`;
  const base = input.appUrl.replace(/\/$/, "");
  return `${base}${path}${input.search || ""}`;
}
