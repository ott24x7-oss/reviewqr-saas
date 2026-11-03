import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { attachReference, reconcilePayment } from "@/lib/manual-payments";
import {
  youpiAmountsMatch,
  youpiConfirmed,
  youpiGetPayment,
  youpiMatchesOrder,
  youpiStatusFailed
} from "@/lib/payments/youpi";
import { activateCompletedPayment } from "@/lib/subscription";
import { rateLimitDb } from "@/lib/rate-limit";

// UPI polling only checks the local credit ledger; inbox polling runs in the cron job.
const lastCheck = new Map<string, number>();
const THROTTLE_MS = 6_000;

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

  if (order.status === "PENDING" && order.provider === "YOUPI" && order.providerPaymentId) {
    const last = lastCheck.get(order.id) || 0;
    if (Date.now() - last > THROTTLE_MS) {
      lastCheck.set(order.id, Date.now());
      try {
        const remote = await youpiGetPayment(order.providerPaymentId);
        if (
          youpiMatchesOrder(remote, order) &&
          youpiAmountsMatch(order.amount, remote) &&
          youpiConfirmed(remote)
        ) {
          await activateCompletedPayment({
            paymentId: order.id,
            providerPaymentId: remote.paymentId,
            providerOrderId: order.id,
            utr: remote.utr,
            verifiedVia: "poll",
            expectedAmountPaise: order.amount,
            expectedOrderId: order.id
          });
          order = (await loadOrder(params.id, user.id)) || order;
        } else if (youpiStatusFailed(remote.status)) {
          await prisma.payment.updateMany({
            where: { id: order.id, status: "PENDING" },
            data: { status: "FAILED" }
          });
          order = (await loadOrder(params.id, user.id)) || order;
        }
      } catch {}
    }
  } else if (order.status === "PENDING" && order.expiresAt && order.expiresAt > new Date()) {
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
  if (!reference || reference.length < 4 || reference.length > 120) {
    return NextResponse.json({ error: "Enter the payment reference (UTR / transaction ID)." }, { status: 400 });
  }
  let order = await loadOrder(params.id, user.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status === "COMPLETED") return NextResponse.json(serialize(order));
  if (order.method === "upi" && !/^\d{8,22}$/.test(reference.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "Enter the 8 to 22 digit bank UTR." }, { status: 400 });
  }
  const rate = await rateLimitDb({ key: `payment-utr:${user.id}:${order.id}`, limit: 5, windowSeconds: 900 });
  if (!rate.ok) return NextResponse.json({ error: "Too many reference attempts. Please wait and try again." }, { status: 429 });

  await attachReference(order.id, user.id, reference);
  order = (await loadOrder(params.id, user.id)) || order;
  try {
    const ok = await reconcilePayment(order);
    if (ok) order = (await loadOrder(params.id, user.id)) || order;
  } catch {}
  return NextResponse.json(serialize(order));
}
