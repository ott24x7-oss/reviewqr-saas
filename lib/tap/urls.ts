export type TapUrlKind = "https" | "tel" | "upi" | "maps";

const MAP_HOSTS = new Set([
  "maps.google.com",
  "www.google.com",
  "google.com",
  "maps.app.goo.gl",
  "goo.gl"
]);

function clean(raw: string) {
  return raw.trim();
}

function httpsUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!url.hostname || url.username || url.password) return null;
  return url;
}

/** Returns a safe URL for the link type, or null when it must be rejected. */
export function safeTapUrl(raw: string, kind: TapUrlKind): string | null {
  const value = clean(raw);
  if (!value || /[\u0000-\u001f]/.test(value)) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return null;

  if (kind === "https") {
    const url = httpsUrl(value);
    return url ? url.toString() : null;
  }

  if (kind === "tel") {
    if (!/^tel:\+?[0-9][0-9\s().-]{6,20}$/i.test(value)) return null;
    return value.replace(/\s/g, "");
  }

  if (kind === "upi") {
    if (!/^upi:(\/\/)?pay\?/i.test(value)) return null;
    if (/[<>"']/.test(value)) return null;
    return value;
  }

  const url = httpsUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (!MAP_HOSTS.has(host)) return null;
  if (host === "google.com" || host === "www.google.com") {
    if (!url.pathname.startsWith("/maps")) return null;
  }
  return url.toString();
}
