/**
 * True only for an https URL whose host is a public name.
 * Localhost, .local, loopback, and private LAN addresses are refused.
 */
export function nfcUrlIsPublicHttps(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (host === "::1" || host === "0.0.0.0") return false;
  if (/^127(?:\.\d{1,3}){0,3}$/.test(host)) return false;
  if (/^10(?:\.\d{1,3}){3}$/.test(host)) return false;
  if (/^192\.168(?:\.\d{1,3}){2}$/.test(host)) return false;
  if (/^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/.test(host)) return false;
  if (host.includes(":") && (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"))) return false;
  return true;
}

/** Absolute tap URL written onto an NTAG. `src=nfc` keeps taps separate from scans. */
export function nfcTapUrl(origin: string, publicPath: string) {
  const base = origin.replace(/\/$/, "");
  const path = publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
  const glue = path.includes("?") ? "&" : "?";
  return `${base}${path}${glue}src=nfc`;
}

/** True when a read-back contains this tap code and the NFC source. */
export function nfcPayloadMatches(payload: string, publicPath: string) {
  const code = publicPath.split("/t/")[1]?.split(/[?#/]/)[0];
  if (!code) return false;
  return payload.includes(`/t/${code}`) && payload.includes("src=nfc");
}
