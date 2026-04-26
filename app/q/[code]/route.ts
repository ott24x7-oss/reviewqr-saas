import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Build a redirect base URL that works behind a reverse proxy (Railway, etc).
 * Order: NEXT_PUBLIC_APP_URL → x-forwarded-proto/host → host header → req.url
 * Without this, req.url is the internal localhost:8080 URL and scans 404 in
 * the user's browser.
 */
function publicBase(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return req.url;
}

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const base = publicBase(req);

  const qr = await prisma.qRCode.findUnique({
    where: { shortCode: params.code },
    include: {
      business: { select: { slug: true, isActive: true, archived: true } },
      location: { select: { slug: true } },
      staff: { select: { slug: true } }
    }
  });

  if (!qr || !qr.isActive || !qr.business.isActive || qr.business.archived) {
    return NextResponse.redirect(new URL("/?error=qr-not-found", base));
  }

  prisma.qRCode
    .update({ where: { id: qr.id }, data: { scans: { increment: 1 } } })
    .catch(() => {});

  const params2 = new URLSearchParams();
  if (qr.location?.slug) params2.set("l", qr.location.slug);
  if (qr.staff?.slug) params2.set("s", qr.staff.slug);
  params2.set("q", qr.shortCode);

  const url = new URL(`/r/${qr.business.slug}`, base);
  url.search = params2.toString();
  return NextResponse.redirect(url);
}
