import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { readWebStepUp } from "@/lib/admin/web-step";
import { payApprovedCommissions } from "@/lib/plans/payout";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  agentId: z.string().min(1),
  utr: z.string().min(6),
  paidAt: z.string().optional(),
  note: z.string().trim().min(1).max(240),
  idempotencyKey: z.string().min(8).max(120).optional()
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const missingReason = parsed.error.issues.some((issue) => issue.path[0] === "note");
    return NextResponse.json({ error: missingReason ? "Enter a reason" : "Enter the agent and UTR" }, { status: 400 });
  }
  if (!readWebStepUp(guard.user.id)) {
    return NextResponse.json({ error: "Enter the WhatsApp code to confirm this payout" }, { status: 403 });
  }
  const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date();
  if (Number.isNaN(paidAt.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const result = await payApprovedCommissions({
    agentId: parsed.data.agentId,
    utr: parsed.data.utr,
    paidAt,
    note: parsed.data.note,
    idempotencyKey: parsed.data.idempotencyKey
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await logAudit({
    userId: guard.user.id,
    action: "commission.pay",
    entity: "CommissionPayout",
    entityId: result.payoutId,
    metadata: { agentId: parsed.data.agentId, amountPaise: result.amountPaise },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({
    ok: true,
    amountPaise: result.amountPaise,
    grossPaise: result.grossPaise,
    tdsPaise: result.tdsPaise,
    netPaise: result.netPaise
  });
}
