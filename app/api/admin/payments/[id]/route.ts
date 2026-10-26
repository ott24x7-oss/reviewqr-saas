import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { approveAdminPayment, reconcileAdminPayment, refundAdminPayment, rejectAdminPayment, resendAdminInvoice } from "@/lib/admin/money";
import { readWebStepUp } from "@/lib/admin/web-step";
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

  const ip = getClientIp(req.headers);
  if (parsed.data.action === "approve") {
    const result = await approveAdminPayment(params.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await logAudit({ userId: guard.user.id, action: "payment.approve", entity: "Payment", entityId: params.id, ip });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "reject") {
    const result = await rejectAdminPayment(params.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await logAudit({ userId: guard.user.id, action: "payment.reject", entity: "Payment", entityId: params.id, ip });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "reconcile") {
    const result = await reconcileAdminPayment(params.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await logAudit({ userId: guard.user.id, action: "payment.reconcile", entity: "Payment", entityId: params.id, ip });
    return NextResponse.json({ ok: true, changed: result.data.changed });
  }

  if (parsed.data.action === "invoice") {
    const result = await resendAdminInvoice(params.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await logAudit({ userId: guard.user.id, action: "payment.invoice", entity: "Payment", entityId: params.id, ip });
    return NextResponse.json({ ok: true });
  }

  if (!parsed.data.reason?.trim()) return NextResponse.json({ error: "Enter a reason" }, { status: 400 });
  if (!readWebStepUp(guard.user.id)) {
    return NextResponse.json({ error: "Enter the WhatsApp code to confirm this payout" }, { status: 403 });
  }
  const result = await refundAdminPayment(params.id, parsed.data.refundUtr || "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logAudit({
    userId: guard.user.id,
    action: "payment.refund",
    entity: "Payment",
    entityId: params.id,
    reason: parsed.data.reason,
    metadata: { refundUtr: parsed.data.refundUtr },
    ip
  });
  return NextResponse.json({ ok: true });
}
