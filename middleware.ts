import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
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
  if (!isDashboard && !isAdmin) return NextResponse.next();

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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
