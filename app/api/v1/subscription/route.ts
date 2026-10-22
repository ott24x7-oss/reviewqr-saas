import { NextRequest } from "next/server";
import { observe } from "@/lib/api/observe";
import { requireV1User, v1Data } from "@/lib/api/v1";
import { prisma } from "@/lib/db";
import { loadEntitlement } from "@/lib/plans/entitlements";

export const dynamic = "force-dynamic";

/** Current subscription for display. The app does not sell plans. */
async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const [user, entitlement, subscription, credit] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { subscriptionStatus: true, subscriptionEndsAt: true, trialEndsAt: true }
    }),
    loadEntitlement(auth.user.id),
    prisma.subscription.findFirst({
      where: { userId: auth.user.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
      include: { plan: { select: { slug: true, nameEn: true, nameHi: true } } }
    }),
    prisma.referralCredit.findUnique({ where: { userId: auth.user.id } })
  ]);
  const pending = subscription?.pendingPlanId
    ? await prisma.plan.findUnique({
        where: { id: subscription.pendingPlanId },
        select: { slug: true, nameEn: true }
      })
    : null;
  return v1Data({
    tier: entitlement.tier,
    status: user?.subscriptionStatus ?? "TRIALING",
    endsAt: subscription?.endsAt ?? user?.subscriptionEndsAt ?? null,
    trialEndsAt: user?.trialEndsAt ?? null,
    modules: entitlement.modules,
    limits: entitlement.limits,
    plan: subscription?.plan
      ? { slug: subscription.plan.slug, nameEn: subscription.plan.nameEn, nameHi: subscription.plan.nameHi, duration: subscription.duration }
      : null,
    pending: pending
      ? { slug: pending.slug, nameEn: pending.nameEn, duration: subscription?.pendingDuration ?? null }
      : null,
    referralCredit: { months: credit?.months ?? 0, days: credit?.days ?? 0 },
    purchase: "web"
  });
}

export const GET = observe(getHandler);
