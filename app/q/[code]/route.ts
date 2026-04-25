import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const qr = await prisma.qRCode.findUnique({
    where: { shortCode: params.code },
    include: {
      business: { select: { slug: true, isActive: true, archived: true } },
      location: { select: { slug: true } },
      staff: { select: { slug: true } }
    }
  });

  if (!qr || !qr.isActive || !qr.business.isActive || qr.business.archived) {
    return NextResponse.redirect(new URL("/?error=qr-not-found", req.url));
  }

  // Track scan async (best-effort)
  prisma.qRCode
    .update({ where: { id: qr.id }, data: { scans: { increment: 1 } } })
    .catch(() => {});

  const params2 = new URLSearchParams();
  if (qr.location?.slug) params2.set("l", qr.location.slug);
  if (qr.staff?.slug) params2.set("s", qr.staff.slug);
  params2.set("q", qr.shortCode);

  const url = new URL(`/r/${qr.business.slug}`, req.url);
  url.search = params2.toString();
  return NextResponse.redirect(url);
}
