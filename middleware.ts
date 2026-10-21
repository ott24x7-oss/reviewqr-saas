import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { incomingRequestId } from "@/lib/api/request-id";
import { canonicalRedirect } from "@/lib/http/canonical";
import { canAccessAdmin } from "@/lib/roles";

/**
 * Login gate stays on /dashboard and /admin. Public QR links stay open.
 * HTTPS and canonical redirects apply only to the configured public host.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const target = canonicalRedirect({
    pathname,
    search: req.nextUrl.search,
    host: req.headers.get("x-forwarded-host") || req.headers.get("host"),
    proto: req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", ""),
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null
  });
  if (target) return NextResponse.redirect(target, 301);

  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isDashboard && !isAdmin) {
    if (pathname.startsWith("/api/v1")) return continueWithRequestId(req);
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false
  });

  if (!token) {
    const url = req.nextUrl.clone();
    const callback = `${pathname}${req.nextUrl.search}`;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(url);
  }

  if (isAdmin && !canAccessAdmin(typeof token.role === "string" ? token.role : null)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

function continueWithRequestId(req: NextRequest) {
  const requestId = incomingRequestId(req.headers.get("x-request-id"));
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("x-request-id", requestId);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
