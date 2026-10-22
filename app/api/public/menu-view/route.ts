import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isBotUserAgent } from "@/lib/analytics/bots";
import { hashVisitor } from "@/lib/analytics/visitor";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { isLookupCode } from "@/lib/tap/ids";

const bodySchema = z.object({
  code: z.string().min(4).max(32),
  itemId: z.string().min(4).max(40),
  visitor: z.string().min(8).max(80)
});

export async function POST(req: NextRequest) {
  if (isBotUserAgent(req.headers.get("user-agent"))) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || !isLookupCode(parsed.data.code)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const visitorHash = hashVisitor(parsed.data.visitor);
  if (!visitorHash) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const limit = await rateLimitDb({ key: `menu-view:${visitorHash.slice(0, 16)}`, limit: 60, windowSeconds: 60 });
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const qr = await prisma.qRCode.findUnique({
    where: { shortCode: parsed.data.code },
    select: { id: true, businessId: true }
  });
  if (!qr?.businessId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const item = await prisma.menuItem.findFirst({
    where: { id: parsed.data.itemId, businessId: qr.businessId },
    select: { id: true }
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.menuItemView.create({
    data: { businessId: qr.businessId, itemId: item.id, qrCodeId: qr.id, visitorHash }
  });
  return NextResponse.json({ ok: true });
}
