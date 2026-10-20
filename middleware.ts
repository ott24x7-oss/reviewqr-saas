import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Page gate only. Public QR links, review pages, webhooks, and cron stay open.
 * API routes keep their own auth checks.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdmin && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/admin", "/admin/:path*"]
};
