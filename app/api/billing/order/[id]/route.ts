import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { attachReference, reconcilePayment } from "@/lib/manual-payments";

// Throttle IMAP checks per order so client polling doesn't hammer the inbox.
const lastCheck = new Map<string, number>();
const THROTTLE_MS = 15_000;

async function loadOrder(id: string, userId: string) {
  return prisma.payment.findFirst({ where: { id, userId } });
}

function serialize(p: any) {
  return {
    id: p.id,
    status: p.status, // PENDING | COMPLETED | FAILED
    method: p.method,
    tier: p.tier,
    amountInrDisplay: (p.amount / 100).toFixed(2),
    amountUsdt: p.amountUsdt,
    reference: p.reference,
    verifiedVia: p.verifiedVia,
    expiresAt: p.expiresAt
  };
}

/** Poll order status — opportunistically reconciles against the inbox (throttled). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let order = await loadOrder(params.id, user.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (order.status === "PENDING" && order.expiresAt && order.expiresAt > new Date()) {
    const last = lastCheck.get(order.id) || 0;
    if (Date.now() - last > THROTTLE_MS) {
      lastCheck.set(order.id, Date.now());
      try {
        const ok = await reconcilePayment(order);
        if (ok) order = (await loadOrder(params.id, user.id)) || order;
      } catch {}
    }
  }
  return NextResponse.json(serialize(order));
}

/** Customer submits their UTR / tx-hash; verify immediately. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as any;
  const reference = String(body.reference || "").trim();
  if (reference.length < 4) {
    return NextResponse.json({ error: "Enter the payment reference (UTR / transaction ID)." }, { status: 400 });
  }
  let order = await loadOrder(params.id, user.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status === "COMPLETED") return NextResponse.json(serialize(order));

  await attachReference(order.id, user.id, reference);
  order = (await loadOrder(params.id, user.id)) || order;
  try {
    const ok = await reconcilePayment(order);
    if (ok) order = (await loadOrder(params.id, user.id)) || order;
  } catch {}
  return NextResponse.json(serialize(order));
}
