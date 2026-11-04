import { featureById, type FeatureId } from "@reviewqr/shared";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readableBusinessWhere } from "@/lib/tenant";
import { featureBlock, accountFeatureBlock } from "./feature-gate";
import { loadEntitlement } from "./entitlements";
import { dashboardFeatureForRoute } from "./dashboard-route-features";

export type LockedFeatureState = {
  featureId: FeatureId;
  plans: Array<{ slug: string; nameEn: string; nameHi: string }>;
};

async function canSkipPlanGate() {
  // The real session stays the admin during impersonation, even though the
  // dashboard page is rendered with the target account's user object.
  return (await getSessionUser())?.role === "ADMIN";
}

async function lockState(featureId: FeatureId, blocked: boolean): Promise<LockedFeatureState | null> {
  if (!blocked) return null;
  const feature = featureById(featureId);
  if (!feature) return null;
  const plans = await prisma.plan.findMany({
    where: { active: true, visibleOnPricingPage: true, modules: { has: feature.module } },
    select: { slug: true, nameEn: true, nameHi: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }]
  });
  return { featureId, plans };
}

/** Returns a locked state for a business owner whose plan omits this feature. */
export async function requireFeature(ownerId: string, featureId: FeatureId): Promise<LockedFeatureState | null> {
  if (await canSkipPlanGate()) return null;
  return lockState(featureId, !!(await featureBlock(ownerId, featureId)));
}

/** Account-level lists follow the same any-readable-business rule as the APIs. */
export async function requireAccountFeature(userId: string, featureId: FeatureId): Promise<LockedFeatureState | null> {
  if (await canSkipPlanGate()) return null;
  return lockState(featureId, !!(await accountFeatureBlock(userId, featureId)));
}

export async function requireFeatureForRoute(ownerId: string, route: string, preferredFeature?: FeatureId) {
  const featureId = dashboardFeatureForRoute(route, preferredFeature);
  if (!featureId) throw new Error(`No dashboard feature mapping for ${route}`);
  return requireFeature(ownerId, featureId);
}

export async function requireAccountFeatureForRoute(userId: string, route: string, preferredFeature?: FeatureId) {
  const featureId = dashboardFeatureForRoute(route, preferredFeature);
  if (!featureId) throw new Error(`No dashboard feature mapping for ${route}`);
  return requireAccountFeature(userId, featureId);
}

export async function getBusinessLockedFeatureIds(ownerId: string, featureIds: readonly FeatureId[]) {
  if (!featureIds.length || await canSkipPlanGate()) return [] as FeatureId[];
  const entitlement = await loadEntitlement(ownerId);
  const modules = new Set(entitlement.modules);
  return Array.from(new Set(featureIds)).filter((featureId) => {
    const feature = featureById(featureId);
    return !!feature && !modules.has(feature.module);
  });
}

/** Entitlement snapshot used to mark feature-backed navigation entries. */
export async function getAccountLockedFeatureIds(userId: string, featureIds: readonly FeatureId[]) {
  if (!featureIds.length || await canSkipPlanGate()) return [] as FeatureId[];
  const businesses = await prisma.business.findMany({
    where: readableBusinessWhere(userId),
    select: { ownerId: true },
    distinct: ["ownerId"]
  });
  // The API's account list rule leaves an account with no businesses open.
  if (!businesses.length) return [] as FeatureId[];
  const ownerIds = Array.from(new Set([userId, ...businesses.map((business) => business.ownerId)]));
  const entitlements = await Promise.all(ownerIds.map((ownerId) => loadEntitlement(ownerId)));
  const availableModules = new Set(entitlements.flatMap((entitlement) => entitlement.modules));
  return Array.from(new Set(featureIds)).filter((featureId) => {
    const feature = featureById(featureId);
    return !!feature && !availableModules.has(feature.module);
  });
}
