import { prisma } from "../db";

export async function payApprovedCommissions(input: {
  agentId: string;
  utr: string;
  paidAt: Date;
  note?: string;
}) {
  const utr = input.utr.trim();
  if (utr.length < 6) return { ok: false as const, error: "Enter the payout UTR" };
  const rows = await prisma.shopCommission.findMany({
    where: { agentId: input.agentId, status: "APPROVED" },
    select: { id: true, amountPaise: true }
  });
  const amountPaise = rows.reduce((sum, row) => sum + row.amountPaise, 0);
  if (!rows.length || amountPaise <= 0) return { ok: false as const, error: "Nothing approved to pay" };
  const payout = await prisma.commissionPayout.create({
    data: {
      agentId: input.agentId,
      amountPaise,
      utr: utr.slice(0, 120),
      paidAt: input.paidAt,
      note: (input.note || "").slice(0, 240)
    }
  });
  await prisma.shopCommission.updateMany({
    where: { id: { in: rows.map((row) => row.id) }, status: "APPROVED" },
    data: { status: "PAID", paidAt: input.paidAt, payoutId: payout.id }
  });
  return { ok: true as const, payoutId: payout.id, amountPaise, count: rows.length };
}

export async function commissionReportRows() {
  const agents = await prisma.agentProfile.findMany({
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });
  const rows = [];
  for (const agent of agents) {
    const [commissions, sales] = await Promise.all([
      prisma.shopCommission.groupBy({
        by: ["status"],
        where: { agentId: agent.userId },
        _sum: { amountPaise: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          user: { businesses: { some: { agentId: agent.userId, archived: false } } }
        },
        _sum: { amount: true },
        _count: { _all: true }
      })
    ]);
    const bucket = (status: string) => commissions.find((row) => row.status === status)?._sum.amountPaise || 0;
    rows.push({
      agentId: agent.userId,
      name: agent.user.name || "Agent",
      phone: agent.user.phone || "",
      email: agent.user.email,
      code: agent.code,
      salesPaise: sales._sum.amount || 0,
      salesCount: sales._count._all,
      pendingPaise: bucket("PENDING"),
      approvedPaise: bucket("APPROVED"),
      paidPaise: bucket("PAID")
    });
  }
  return rows;
}
