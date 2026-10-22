import { NextRequest, NextResponse } from "next/server";
import { absoluteRedirect, destinationFor, directRedirectResponse, ownHostsFrom } from "@/lib/tap/direct-http";

export async function middleware(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/^\/(q|t)\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();
  if (req.nextUrl.searchParams.get("page") === "1") return NextResponse.next();

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
    if (!res.ok) return NextResponse.next();
    const body = (await res.json()) as { redirect?: unknown };
    if (typeof body.redirect !== "string" || !body.redirect) return NextResponse.next();
    const hosts = ownHostsFrom(req.headers.get("host") || req.nextUrl.host, process.env.NEXT_PUBLIC_APP_URL);
    const safe = destinationFor(body.redirect, hosts);
    if (!safe) return NextResponse.next();
    const location = absoluteRedirect(safe, req.nextUrl.origin);
    if (!location) return NextResponse.next();
    return directRedirectResponse(location);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  // The segment pattern has to be written out. A bare :code makes Next append
  // (.json) to that name, and then /q/<code> never matches.
  matcher: ["/q/:code([^/]+)", "/t/:code([^/]+)"]
};
