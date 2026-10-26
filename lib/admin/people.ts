import type { PlanDuration, SubscriptionStatus, SubscriptionTier, UserRole } from "@prisma/client";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { requestLoginOtp } from "@/lib/otp";
import { durationMonths } from "@/lib/plans/catalog";
import { editUserSubscription, grantPlanAccess } from "@/lib/plans/snapshot";
import { maskPhone } from "./mask";

function addMonths(from: Date, months: number) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function loadAdminUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
      suspendedAt: true,
      createdAt: true,
      businesses: { select: { id: true, name: true, slug: true, isActive: true }, take: 20 },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, amount: true, status: true, provider: true, createdAt: true }
      }
    }
  });
  if (!user) return fail(404, "User not found");
  const [subscription, devices, timeline] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: {
        planId: true,
        status: true,
        endsAt: true,
        modules: true,
        duration: true,
        pricePaise: true,
        plan: { select: { nameEn: true } }
      }
    }),
    prisma.device.findMany({
      where: { business: { ownerId: id } },
      select: { id: true, shortCode: true, status: true, kind: true },
      take: 20
    }),
    prisma.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, action: true, createdAt: true, reason: true }
    })
  ]);
  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: maskPhone(user.phone),
    role: user.role,
    suspended: !!user.suspendedAt,
    tier: user.subscriptionTier,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionEndsAt: user.subscriptionEndsAt?.toISOString() || null,
    trialEndsAt: user.trialEndsAt?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    subscription: subscription
      ? {
          planId: subscription.planId,
          plan: subscription.plan?.nameEn || null,
          status: subscription.status,
          endsAt: subscription.endsAt?.toISOString() || null,
          duration: subscription.duration,
          modules: subscription.modules,
          pricePaise: subscription.pricePaise
        }
      : null,
    businesses: user.businesses,
    payments: user.payments.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    devices,
    timeline: timeline.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
  });
}

export async function revealAdminUserPhone(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { phone: true } });
  if (!user) return fail(404, "User not found");
  return ok({ phone: user.phone || "" });
}

async function loadUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      phone: true,
      role: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true
    }
  });
}

function pickPlanPrice<T extends { duration: PlanDuration; active: boolean }>(prices: T[], duration?: PlanDuration) {
  return prices.find((row) => row.duration === duration && row.active) || prices.find((row) => row.active) || prices[0];
}

/**
 * True when this plan change would grant more than one month (yearly, six months, lifetime).
 * Uses the same price pick as changeAdminUserPlan, so a missing duration cannot hide a long grant.
 */
export async function adminPlanChangeIsLong(planId: string, duration?: PlanDuration) {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { prices: true } });
  const price = plan ? pickPlanPrice(plan.prices, duration) : null;
  if (!price) return false;
  const months = durationMonths(price.duration);
  return months == null || months > 1;
}

export async function changeAdminUserPlan(userId: string, planId: string, duration?: PlanDuration) {
  const [user, plan] = await Promise.all([
    loadUser(userId),
    prisma.plan.findUnique({ where: { id: planId }, include: { prices: true } })
  ]);
  if (!user) return fail(404, "User not found");
  if (!plan) return fail(404, "Plan not found");
  const price = pickPlanPrice(plan.prices, duration);
  if (!price) return fail(400, "That plan has no price");
  const months = durationMonths(price.duration);
  const endsAt = months == null ? null : addMonths(new Date(), months);
  const before = { tier: user.subscriptionTier, status: user.subscriptionStatus, endsAt: user.subscriptionEndsAt };
  await prisma.$transaction((tx) =>
    grantPlanAccess(tx, {
      userId,
      tier: plan.legacyTier,
      status: "ACTIVE",
      endsAt,
      planId: plan.id,
      duration: price.duration,
      modules: plan.modules,
      limits: plan.limits,
      pricePaise: price.pricePaise,
      clearPending: true
    })
  );
  return ok({ before, after: { planId: plan.id, duration: price.duration, endsAt } });
}

export async function grantAdminDays(userId: string, days: number) {
  const user = await loadUser(userId);
  if (!user) return fail(404, "User not found");
  const now = new Date();
  const base = user.subscriptionEndsAt && user.subscriptionEndsAt > now ? user.subscriptionEndsAt : now;
  const endsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  const status: SubscriptionStatus = user.subscriptionStatus === "TRIALING" ? "TRIALING" : "ACTIVE";
  await prisma.$transaction((tx) =>
    editUserSubscription(tx, { userId, tier: user.subscriptionTier, status, endsAt })
  );
  return ok({
    before: { endsAt: user.subscriptionEndsAt, status: user.subscriptionStatus },
    after: { endsAt, status, days }
  });
}

export async function cancelAdminUser(userId: string) {
  const user = await loadUser(userId);
  if (!user) return fail(404, "User not found");
  await prisma.$transaction((tx) =>
    editUserSubscription(tx, {
      userId,
      tier: user.subscriptionTier,
      status: "CANCELED",
      endsAt: user.subscriptionEndsAt
    })
  );
  return ok({ before: { status: user.subscriptionStatus }, after: { status: "CANCELED" } });
}

export async function setAdminUserSuspended(userId: string, suspended: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, suspendedAt: true } });
  if (!user) return fail(404, "User not found");
  const suspendedAt = suspended ? user.suspendedAt || new Date() : null;
  await prisma.user.update({ where: { id: userId }, data: { suspendedAt } });
  return ok({ before: { suspended: !!user.suspendedAt }, after: { suspended } });
}

export async function resendAdminLogin(userId: string) {
  const user = await loadUser(userId);
  if (!user) return fail(404, "User not found");
  if (!user.phone) return fail(400, "This account has no mobile number");
  await requestLoginOtp(user.phone);
  return ok({ sent: true });
}

export async function resetAdminOnboarding(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return fail(404, "User not found");
  await prisma.onboardingMark.deleteMany({ where: { userId } });
  await prisma.onboardingDraft.deleteMany({ where: { userId } });
  return ok({ reset: true });
}

export async function setAdminUserRole(userId: string, role: UserRole) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) return fail(404, "User not found");
  await prisma.user.update({ where: { id: userId }, data: { role } });
  return ok({ before: { role: user.role }, after: { role } });
}

export async function loadAdminBusiness(id: string) {
  const business = await prisma.business.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      city: true,
      phone: true,
      email: true,
      createdAt: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true
        }
      }
    }
  });
  if (!business) return fail(404, "Business not found");
  const timeline = await prisma.auditLog.findMany({
    where: { entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, createdAt: true, reason: true }
  });
  return ok({
    id: business.id,
    name: business.name,
    slug: business.slug,
    isActive: business.isActive,
    city: business.city,
    phone: maskPhone(business.phone),
    email: business.email,
    createdAt: business.createdAt.toISOString(),
    owner: {
      id: business.owner.id,
      name: business.owner.name,
      email: business.owner.email,
      phone: maskPhone(business.owner.phone),
      tier: business.owner.subscriptionTier,
      subscriptionStatus: business.owner.subscriptionStatus,
      subscriptionEndsAt: business.owner.subscriptionEndsAt?.toISOString() || null
    },
    timeline: timeline.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
  });
}

export async function revealAdminBusinessPhone(id: string) {
  const business = await prisma.business.findUnique({
    where: { id },
    select: { phone: true, owner: { select: { phone: true } } }
  });
  if (!business) return fail(404, "Business not found");
  return ok({ phone: business.phone || business.owner.phone || "" });
}

export async function noteAdminUser(id: string, note: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return fail(404, "User not found");
  return ok({ after: { note } });
}

export async function noteAdminBusiness(id: string, note: string) {
  const business = await prisma.business.findUnique({ where: { id }, select: { id: true } });
  if (!business) return fail(404, "Business not found");
  return ok({ after: { note } });
}

export async function loadAdminUserEditor(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true
    }
  });
  if (!user) return fail(404, "User not found");
  return ok({
    ...user,
    trialEndsAt: user.trialEndsAt?.toISOString() || null,
    subscriptionEndsAt: user.subscriptionEndsAt?.toISOString() || null
  });
}

export async function loadAdminBusinessDesk(id: string) {
  const business = await prisma.business.findUnique({
    where: { id },
    select: { id: true, reviewGating: true, ratingThreshold: true }
  });
  if (!business) return fail(404, "Business not found");
  const [qrs, orders, reviews] = await Promise.all([
    prisma.qRCode.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, shortCode: true, label: true, status: true, scans: true }
    }),
    prisma.shopOrder.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, status: true, totalPaise: true, invoiceNumber: true, createdAt: true }
    }),
    prisma.review.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, rating: true, createdAt: true }
    })
  ]);
  return ok({
    reviewGating: business.reviewGating,
    ratingThreshold: business.ratingThreshold,
    qrs,
    orders: orders.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    reviews: reviews.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
  });
}

export async function setAdminBusinessActive(id: string, active: boolean) {
  const business = await prisma.business.findUnique({ where: { id }, select: { id: true, isActive: true } });
  if (!business) return fail(404, "Business not found");
  await prisma.business.update({ where: { id }, data: { isActive: active } });
  return ok({ before: { isActive: business.isActive }, after: { isActive: active } });
}
