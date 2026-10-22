import { NextResponse } from "next/server";
import { safeTapUrl } from "./urls";

const INTERNAL_PAGE = /^\/(?:q|t)\/[^/]+\/(?:menu|contact)\/?$/;

function pathOnly(value: string) {
  const cut = value.split("?")[0]?.split("#")[0] || "";
  return cut.length > 1 && cut.endsWith("/") ? cut.slice(0, -1) : cut;
}

/**
 * A redirect target we are willing to send a customer to.
 * Internal menu and contact pages stay on our host. Anything else must be https.
 * Our own /q and /t scan URLs are rejected so a button cannot loop.
 */
export function destinationFor(href: string, ownHosts: string[]): string | null {
  const value = href.trim();
  if (!value || /[\u0000-\u001f]/.test(value)) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return null;

  if (value.startsWith("/") && !value.startsWith("//")) {
    return INTERNAL_PAGE.test(pathOnly(value)) ? value : null;
  }

  const safe = safeTapUrl(value, "https");
  if (!safe) return null;
  let url: URL;
  try {
    url = new URL(safe);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (ownHosts.some((item) => item.toLowerCase() === host)) {
    if (!INTERNAL_PAGE.test(pathOnly(url.pathname))) return null;
    return `${url.pathname}${url.search}`;
  }
  return url.toString();
}

export function absoluteRedirect(href: string, origin: string): string | null {
  try {
    return new URL(href, origin).toString();
  } catch {
    return null;
  }
}

export function ownHostsFrom(hostHeader: string, appUrl: string | undefined, extraHosts: string[] = []) {
  const hosts = new Set<string>();
  const raw = hostHeader.split(",")[0]?.trim().toLowerCase() || "";
  const hostname = raw.replace(/:\d+$/, "");
  if (hostname) hosts.add(hostname);
  if (appUrl) {
    try {
      hosts.add(new URL(appUrl).hostname.toLowerCase());
    } catch {
      // An unset or relative app URL does not add a host.
    }
  }
  for (const item of extraHosts) {
    const name = item.trim().toLowerCase().replace(/:\d+$/, "");
    if (name) hosts.add(name);
  }
  return [...hosts];
}

/** 302 so a later settings change applies without reprinting. Browsers must not cache it. */
export function directRedirectResponse(location: string) {
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store"
    }
  });
}
