import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { payApprovedCommissions } from "@/lib/plans/payout";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  agentId: z.string().min(1),
  utr: z.string().min(6),
  paidAt: z.string().optional(),
  note: z.string().max(240).optional(),
  reason: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().min(8).max(120).optional()
});

/** A date-only value from the form is that day in India, not UTC midnight. */
function readPaidAt(value: string | undefined) {
  if (!value) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const start = new Date(`${value}T00:00:00+05:30`);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    return value === today ? new Date() : start;
  }
  return new Date(value);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter the agent and UTR" }, { status: 400 });
  const reason = parsed.data.reason || "";
  if (!reason) return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  const paidAt = readPaidAt(parsed.data.paidAt);
  if (Number.isNaN(paidAt.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  const approved = await prisma.shopCommission.aggregate({
    where: { agentId: parsed.data.agentId, status: "APPROVED" },
    _sum: { amountPaise: true },
    _count: { _all: true }
  });
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
    reason,
    before: { approvedPaise: approved._sum.amountPaise || 0, approvedCount: approved._count._all },
    after: {
      payoutId: result.payoutId,
      already: result.already,
      grossPaise: result.grossPaise,
      tdsPaise: result.tdsPaise,
      netPaise: result.netPaise,
      paidAt: paidAt.toISOString()
    },
    metadata: { agentId: parsed.data.agentId, amountPaise: result.amountPaise },
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent") || undefined
  });
  return NextResponse.json({
    ok: true,
    amountPaise: result.amountPaise,
    grossPaise: result.grossPaise,
    tdsPaise: result.tdsPaise,
    netPaise: result.netPaise
  });
}
