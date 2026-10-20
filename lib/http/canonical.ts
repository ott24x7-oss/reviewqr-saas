/**
 * HTTPS and canonical-host redirect.
 * Only the public host from NEXT_PUBLIC_APP_URL, and its www/apex pair, are
 * redirected. Every other host (Railway healthchecks, localhost) passes through.
 * /api/health is never redirected, even on the public host.
 */

export type CanonicalInput = {
  pathname: string;
  search: string;
  host: string | null;
  proto: string | null;
  appUrl: string | null;
};

function hostnameOf(host: string) {
  const value = host.trim().toLowerCase();
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end >= 0 ? value.slice(1, end) : value;
  }
  return value.split(":")[0];
}

function portOf(host: string, proto: string) {
  const value = host.trim().toLowerCase();
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    const rest = end >= 0 ? value.slice(end + 1) : "";
    if (rest.startsWith(":")) return rest.slice(1);
  } else {
    const parts = value.split(":");
    if (parts.length === 2 && parts[1]) return parts[1];
  }
  return proto === "https" ? "443" : "80";
}

/** True when the request host is the configured host or its www/apex twin. */
export function isPublicHostPair(requestHost: string, canonicalHost: string) {
  const requestName = hostnameOf(requestHost);
  const canonicalName = hostnameOf(canonicalHost);
  if (!requestName || !canonicalName) return false;
  if (requestName === canonicalName) return true;
  const apex = canonicalName.startsWith("www.") ? canonicalName.slice(4) : canonicalName;
  if (!apex || apex.includes("..")) return false;
  return requestName === apex || requestName === `www.${apex}`;
}

/** Absolute URL to redirect to, or null when the request should pass through. */
export function canonicalRedirect(input: CanonicalInput): string | null {
  if (input.pathname === "/api/health" || input.pathname.startsWith("/api/health/")) return null;
  if (!input.appUrl || !input.host) return null;

  let app: URL;
  try {
    app = new URL(input.appUrl);
  } catch {
    return null;
  }
  if (app.protocol !== "http:" && app.protocol !== "https:") return null;

  const requestHost = input.host.split(",")[0]?.trim().toLowerCase() || "";
  if (!requestHost || !isPublicHostPair(requestHost, app.host)) return null;

  const requestProto = (input.proto || "").split(",")[0]?.trim().toLowerCase().replace(":", "") || "";
  if (requestProto !== "http" && requestProto !== "https") return null;

  const canonicalProto = app.protocol.replace(":", "");
  const sameHost = hostnameOf(requestHost) === app.hostname.toLowerCase();
  const samePort = portOf(requestHost, requestProto) === (app.port || (canonicalProto === "https" ? "443" : "80"));
  if (sameHost && samePort && requestProto === canonicalProto) return null;

  return new URL(`${input.pathname}${input.search || ""}`, app.origin).toString();
}
