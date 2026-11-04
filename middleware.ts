import { NextRequest, NextResponse } from "next/server";
import { legacyHostnames, legacyHostRedirect } from "@/lib/http/legacy-host";
import { absoluteRedirect, destinationFor, directRedirectResponse, ownHostsFrom } from "@/lib/tap/direct-http";

export async function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  const isHindi = req.nextUrl.pathname === "/hi" || req.nextUrl.pathname.startsWith("/hi/");
  requestHeaders.set("x-app-locale", isHindi ? "hi" : "en");
  const nextWithLocale = () => NextResponse.next({ request: { headers: requestHeaders } });

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  const legacy = legacyHostRedirect({
    pathname: req.nextUrl.pathname,
    search: req.nextUrl.search,
    host,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    legacyHosts: process.env.LEGACY_HOSTS || null
  });
  if (legacy) return NextResponse.redirect(legacy, 301);

  const match = req.nextUrl.pathname.match(/^\/(q|t)\/([^/]+)\/?$/);
  if (!match) return nextWithLocale();
  if (req.nextUrl.searchParams.get("page") === "1") return nextWithLocale();

  const channel = match[1];
  const code = decodeURIComponent(match[2] || "");
  const decide = req.nextUrl.clone();
  decide.pathname = "/api/public/direct-scan";
  decide.search = "";
  decide.searchParams.set("code", code);
  decide.searchParams.set("channel", channel);
  const src = req.nextUrl.searchParams.get("src");
  if (src) decide.searchParams.set("src", src);

  const headers = new Headers();
  headers.set("x-scan-host", req.headers.get("host") || req.nextUrl.host);
  headers.set("user-agent", req.headers.get("user-agent") || "");
  const forwarded = req.headers.get("x-forwarded-for") || req.ip || "";
  if (forwarded) headers.set("x-forwarded-for", forwarded);

  try {
    const res = await fetch(decide, { headers, cache: "no-store" });
    if (!res.ok) return nextWithLocale();
    const body = (await res.json()) as { redirect?: unknown };
    if (typeof body.redirect !== "string" || !body.redirect) return nextWithLocale();
    const hosts = ownHostsFrom(host, process.env.NEXT_PUBLIC_APP_URL, legacyHostnames(process.env.LEGACY_HOSTS));
    const safe = destinationFor(body.redirect, hosts);
    if (!safe) return nextWithLocale();
    const location = absoluteRedirect(safe, req.nextUrl.origin);
    if (!location) return nextWithLocale();
    return directRedirectResponse(location);
  } catch {
    return nextWithLocale();
  }
}

export const config = {
  // A catch-all, not a :code param. A bare :code makes Next append (.json),
  // and then /q/<code> never matches. Static files stay out of this matcher.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
