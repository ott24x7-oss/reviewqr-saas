import type { SubscriptionTier } from "@prisma/client";
import { prisma } from "../db";
import { effectiveTier } from "../payments";
import { cleanModules, limitValue, parseLimits, type ModuleId, type PlanLimits } from "./catalog";
import { defaultLimitsForTier, isCataloguePlan, planAccessForTier, snapshotGrants } from "./legacy";
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
    const access = await planAccessForTier("FREE");
    return { tier: "FREE", modules: cleanModules(access.modules), limits: access.limits };
  }
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { modules: true, limits: true } } }
  });
  if (sub && snapshotGrants({ tier: sub.tier, status: sub.status, endsAt: sub.endsAt })) {
    const tier = sub.tier;
    // Every linked plan row is live, including rows with plan_legacy_* ids.
    if (sub.plan) {
      return {
        tier,
        modules: cleanModules(sub.plan.modules),
        limits: parseLimits(sub.plan.limits, await defaultLimitsForTier(tier))
      };
    }
    // If a non-legacy catalogue row was removed, keep its saved purchase snapshot.
    if (isCataloguePlan(sub.planId)) {
      const defaults = await defaultLimitsForTier(tier);
      return { tier, modules: cleanModules(sub.modules), limits: parseLimits(sub.limits, defaults) };
    }
    const access = await planAccessForTier(tier);
    return { tier, modules: cleanModules(access.modules), limits: access.limits };
  }
  const tier = effectiveTier(user);
  const access = await planAccessForTier(tier);
  return { tier, modules: cleanModules(access.modules), limits: access.limits };
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
    where: { active: true, visibleOnPricingPage: true, modules: { has: moduleId } },
    orderBy: { sortOrder: "asc" },
    include: { prices: { where: { active: true, duration: "MONTH_1", pricePaise: { gt: 0 } } } }
  });
  const match = plans.find((plan) => plan.prices[0]);
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
