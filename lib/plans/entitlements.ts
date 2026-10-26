import type { SubscriptionTier } from "@prisma/client";
import { prisma } from "../db";
import { effectiveTier } from "../payments";
import { cleanModules, limitValue, parseLimits, type ModuleId, type PlanLimits } from "./catalog";
import { isCataloguePlan, limitsForTier, modulesForTier, snapshotGrants } from "./legacy";
import { formatINR } from "../utils";

export type Entitlement = {
  tier: SubscriptionTier;
  modules: ModuleId[];
  limits: PlanLimits;
};

const userSelect = {
  id: true,
  subscriptionTier: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  subscriptionEndsAt: true
} as const;

export async function loadEntitlement(userId: string): Promise<Entitlement> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
  if (!user) {
    return { tier: "FREE", modules: cleanModules(modulesForTier("FREE")), limits: await limitsForTier("FREE") };
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { modules: true, limits: true } } }
  });
  if (sub && snapshotGrants({ tier: sub.tier, status: sub.status, endsAt: sub.endsAt })) {
    const tier = sub.tier;
    // A catalogue plan follows the current row, so an admin edit reaches the app without a deploy.
    // The subscription row stays the purchase record when the plan itself is gone.
    if (isCataloguePlan(sub.planId)) {
      return {
        tier,
        modules: cleanModules(sub.plan ? sub.plan.modules : sub.modules),
        limits: parseLimits(sub.plan ? sub.plan.limits : sub.limits, await limitsForTier(tier))
      };
    }
    return { tier, modules: cleanModules(modulesForTier(tier)), limits: await limitsForTier(tier) };
  }
  const tier = effectiveTier(user);
  return { tier, modules: cleanModules(modulesForTier(tier)), limits: await limitsForTier(tier) };
}

export async function hasModule(userId: string, moduleId: ModuleId) {
  const ent = await loadEntitlement(userId);
  return ent.modules.includes(moduleId);
}

export async function limit(userId: string, key: string) {
  const ent = await loadEntitlement(userId);
  return limitValue(ent.limits, key);
}

const LOCKED: Record<ModuleId, string> = {
  REVIEWS: "Add Reviews to collect feedback and public review links.",
  MENU: "Add Menu to show your catalogue on the tap page.",
  STORE: "Add WhatsApp Store to take orders."
};

export async function moduleBlock(ownerId: string, moduleId: ModuleId) {
  if (await hasModule(ownerId, moduleId)) return null;
  return LOCKED[moduleId];
}

export async function upsellOffer(moduleId: ModuleId) {
  const plans = await prisma.plan.findMany({
    where: { active: true, visibleOnPricingPage: true },
    orderBy: { sortOrder: "asc" },
    include: { prices: { where: { active: true, duration: "MONTH_1", pricePaise: { gt: 0 } } } }
  });
  const match = plans.find((plan) => cleanModules(plan.modules).includes(moduleId) && plan.prices[0]);
  const price = match?.prices[0];
  if (!match || !price) {
    return { title: LOCKED[moduleId], href: "/pricing", priceLabel: "" };
  }
  const name = match.nameEn;
  return {
    title: moduleId === "STORE" ? `Add WhatsApp Store — ${formatINR(price.pricePaise)}/month` : `Add ${name} — ${formatINR(price.pricePaise)}/month`,
    href: `/register?plan=${encodeURIComponent(match.slug)}&duration=MONTH_1`,
    priceLabel: `${formatINR(price.pricePaise)}/month`
  };
}
