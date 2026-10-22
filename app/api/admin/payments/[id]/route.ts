import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { activateManually } from "@/lib/manual-payments";
import { reverseCommissionsForPayment } from "@/lib/plans/ledger";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  action: z.enum(["approve", "reject", "refund"]),
  refundUtr: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { id: params.id } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.action === "approve") {
    if (payment.provider === "YOUPI") {
      return NextResponse.json(
        { error: "YouPI payments are confirmed by the gateway. Use refund only after they complete." },
        { status: 409 }
      );
    }
    try {
      const ok = await activateManually(payment.id);
      if (!ok) return NextResponse.json({ error: "Payment cannot be approved" }, { status: 409 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message || "Payment cannot be approved" }, { status: 409 });
    }
    await logAudit({
      userId: guard.user.id,
      action: "payment.approve",
      entity: "Payment",
      entityId: payment.id,
      ip: getClientIp(req.headers)
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "reject") {
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "QUEUED"] } },
      data: { status: "FAILED" }
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Only a pending payment can be rejected" }, { status: 409 });
    }
    await logAudit({
      userId: guard.user.id,
      action: "payment.reject",
      entity: "Payment",
      entityId: payment.id,
      ip: getClientIp(req.headers)
    });
    return NextResponse.json({ ok: true });
  }

  const refundUtr = (parsed.data.refundUtr || "").trim();
  if (refundUtr.length < 6) {
    return NextResponse.json({ error: "Enter the refund UTR" }, { status: 400 });
  }
  const updated = await prisma.payment.updateMany({
    where: { id: payment.id, status: "COMPLETED" },
    data: { status: "REFUNDED", refundUtr: refundUtr.slice(0, 120) }
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Only a completed payment can be refunded" }, { status: 409 });
  }
  await reverseCommissionsForPayment(payment.id);
  await logAudit({
    userId: guard.user.id,
    action: "payment.refund",
    entity: "Payment",
    entityId: payment.id,
    metadata: { refundUtr },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
