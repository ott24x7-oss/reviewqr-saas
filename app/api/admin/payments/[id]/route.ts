import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { approveAdminPayment, reconcileAdminPayment, refundAdminPayment, rejectAdminPayment, resendAdminInvoice } from "@/lib/admin/money";
import { spendWebStepUp, stepUpRequired } from "@/lib/admin/web-step";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  action: z.enum(["approve", "reject", "refund", "reconcile", "invoice"]),
  refundUtr: z.string().optional(),
  reason: z.string().trim().max(500).optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const reason = parsed.data.reason || "";
  // Approve activates a plan and creates commissions; refund reverses money. Both need a reason.
  if ((parsed.data.action === "approve" || parsed.data.action === "refund") && !reason) {
    return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  }

  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get("user-agent") || undefined;
  if (parsed.data.action === "approve") {
    const result = await approveAdminPayment(params.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await logAudit({
      userId: guard.user.id,
      action: "payment.approve",
      entity: "Payment",
      entityId: params.id,
      reason,
      before: result.data.before,
      after: result.data.after,
      ip,
      userAgent
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "reject") {
    const result = await rejectAdminPayment(params.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await logAudit({
      userId: guard.user.id,
      action: "payment.reject",
      entity: "Payment",
      entityId: params.id,
      reason: reason || null,
      before: result.data.before,
      after: result.data.after,
      ip,
      userAgent
    });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "reconcile") {
    const result = await reconcileAdminPayment(params.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await logAudit({
      userId: guard.user.id,
      action: "payment.reconcile",
      entity: "Payment",
      entityId: params.id,
      reason: reason || null,
      before: result.data.before,
      after: result.data.after,
      ip,
      userAgent
    });
    return NextResponse.json({ ok: true, changed: result.data.changed });
  }

  if (parsed.data.action === "invoice") {
    const result = await resendAdminInvoice(params.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await logAudit({ userId: guard.user.id, action: "payment.invoice", entity: "Payment", entityId: params.id, ip, userAgent });
    return NextResponse.json({ ok: true });
  }

  // Refuse a missing UTR before the one-time code is spent; the service checks it again.
  if ((parsed.data.refundUtr || "").trim().length < 6) {
    return NextResponse.json({ error: "Enter the refund UTR" }, { status: 400 });
  }
  if (!(await spendWebStepUp(req, guard.user.id, "refund_payment"))) {
    return stepUpRequired("refund_payment", "Enter the WhatsApp code to confirm this refund");
  }
  const result = await refundAdminPayment(params.id, parsed.data.refundUtr || "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logAudit({
    userId: guard.user.id,
    action: "payment.refund",
    entity: "Payment",
    entityId: params.id,
    reason,
    before: result.data.before,
    after: result.data.after,
    metadata: { refundUtr: parsed.data.refundUtr },
    ip,
    userAgent
  });
  return NextResponse.json({ ok: true });
}
