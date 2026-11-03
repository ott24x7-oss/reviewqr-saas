import { NextRequest, NextResponse } from "next/server";
import { requireV1User } from "@/lib/api/v1";
import { prisma } from "@/lib/db";
import { getPaymentsConfig } from "@/lib/settings";
import { rateLimitDb } from "@/lib/rate-limit";
import { matchPendingBankCreditsForShopOrder } from "@/lib/bank-credit-ledger";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const cfg = await getPaymentsConfig();
  if (cfg.upiGateway !== "manual") return NextResponse.json({ error: { message: "Manual UPI is not active." } }, { status: 400 });
  const limited = await rateLimitDb({ key: `shop-upi-utr:${auth.user.id}:${params.id}`, limit: 5, windowSeconds: 900 });
  if (!limited.ok) return NextResponse.json({ error: { message: "Too many reference attempts. Please wait." } }, { status: 429 });
  const body = await req.json().catch(() => ({})) as { utr?: unknown };
  const utr = String(body.utr || "").replace(/\s/g, "");
  if (!/^\d{8,22}$/.test(utr)) return NextResponse.json({ error: { message: "Enter the 8 to 22 digit bank UTR." } }, { status: 400 });
  const updated = await prisma.shopOrder.updateMany({
    where: { id: params.id, userId: auth.user.id, status: "PENDING_PAYMENT", paymentStatus: "PENDING", expiresAt: { gt: new Date() } },
    data: { utr }
  });
  if (!updated.count) return NextResponse.json({ error: { message: "This payment is no longer open." } }, { status: 404 });
  await matchPendingBankCreditsForShopOrder(params.id).catch(() => false);
  const order = await prisma.shopOrder.findFirst({ where: { id: params.id, userId: auth.user.id }, select: { status: true, paymentStatus: true } });
  return NextResponse.json({ data: order });
}
