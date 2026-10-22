import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { payApprovedCommissions } from "@/lib/plans/payout";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  agentId: z.string().min(1),
  utr: z.string().min(6),
  paidAt: z.string().optional(),
  note: z.string().max(240).optional()
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter the agent and UTR" }, { status: 400 });
  const paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date();
  if (Number.isNaN(paidAt.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const result = await payApprovedCommissions({
    agentId: parsed.data.agentId,
    utr: parsed.data.utr,
    paidAt,
    note: parsed.data.note
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
  return NextResponse.json({ ok: true, amountPaise: result.amountPaise });
}
