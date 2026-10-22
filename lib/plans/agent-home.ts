import { prisma } from "../db";
import { absoluteUrl } from "../utils";

const SOON_MS = 14 * 24 * 60 * 60 * 1000;

export async function loadAgentHome(agentId: string) {
  const profile = await prisma.agentProfile.findUnique({
    where: { userId: agentId },
    include: { user: { select: { name: true, phone: true } } }
  });
  if (!profile) return null;
  const businesses = await prisma.business.findMany({
    where: { agentId, archived: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          id: true,
          name: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true
        }
      }
    }
  });
  const ownerIds = [...new Set(businesses.map((business) => business.owner.id))];
  const [subscriptions, commissions, payouts, sales] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId: { in: ownerIds }, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
      include: { plan: { select: { nameEn: true } } }
    }),
    prisma.shopCommission.findMany({
      where: { agentId },
      select: { status: true, amountPaise: true }
    }),
    prisma.commissionPayout.findMany({
      where: { agentId },
      orderBy: { paidAt: "desc" },
      take: 20
    }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED", userId: { in: ownerIds } },
      _sum: { amount: true },
      _count: { _all: true }
    })
  ]);
  const byOwner = new Map<string, (typeof subscriptions)[number]>();
  for (const row of subscriptions) {
    if (!byOwner.has(row.userId)) byOwner.set(row.userId, row);
  }
  const now = Date.now();
  const totals = { PENDING: 0, APPROVED: 0, PAID: 0, REVERSED: 0 };
  for (const row of commissions) {
    if (row.status in totals) totals[row.status as keyof typeof totals] += row.amountPaise;
  }
  const link = absoluteUrl(`/join/${profile.code}`);
  return {
    name: profile.user.name || "Agent",
    code: profile.code,
    link,
    shareText: `Join me on ReviewQR: ${link}`,
    businesses: businesses.map((business) => {
      const sub = byOwner.get(business.owner.id);
      const endsAt = sub?.endsAt || business.owner.subscriptionEndsAt;
      return {
        id: business.id,
        name: business.name,
        owner: business.owner.name || "Owner",
        plan: sub?.plan?.nameEn || business.owner.subscriptionTier,
        status: business.owner.subscriptionStatus,
        endsAt,
        dueSoon: !!endsAt && endsAt.getTime() >= now && endsAt.getTime() - now <= SOON_MS
      };
    }),
    totals,
    salesPaise: sales._sum.amount || 0,
    salesCount: sales._count._all,
    payouts: payouts.map((payout) => ({
      id: payout.id,
      amountPaise: payout.amountPaise,
      utr: payout.utr,
      paidAt: payout.paidAt,
      note: payout.note
    }))
  };
}
