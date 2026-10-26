import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { approveAdminPayment, refundAdminPayment, rejectAdminPayment } from "@/lib/admin/money";
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

  const result = await refundAdminPayment(params.id, parsed.data.refundUtr || "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logAudit({
    userId: guard.user.id,
    action: "payment.refund",
    entity: "Payment",
    entityId: params.id,
    metadata: { refundUtr: parsed.data.refundUtr },
    ip
  });
  return NextResponse.json({ ok: true });
}
