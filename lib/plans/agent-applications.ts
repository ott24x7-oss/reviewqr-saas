import { Prisma } from "@prisma/client";
import type { AgentApplicationSubmit } from "@reviewqr/shared";
import { prisma } from "../db";
import { rateLimitDb } from "../rate-limit";
import { fail, ok, type ServiceResult } from "../api/result";
import { phoneKey } from "../otp";
import { sendPushToUsers } from "../push";
import { freshAgentCode } from "./agents";
import { joinTeam } from "./agent-team";
import { getTeamProgramSettings } from "./team-settings";
import { commissionAmount, pickCommissionRule, type CommissionRuleView } from "./commission-rules";
import { getShopCheckoutConfig } from "../settings";

export const RESELLER_TERMS_VERSION = "reseller-v1";
const DEFAULT_REJECTION_COOLDOWN_DAYS = 30;

class ApplicationConflict extends Error {}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + Math.max(0, Math.floor(days)) * 86_400_000);
}

async function rejectionCooldownDays() {
  const settings = await getTeamProgramSettings();
  return Number.isInteger(settings.applicationRejectionCooldownDays) ? settings.applicationRejectionCooldownDays : DEFAULT_REJECTION_COOLDOWN_DAYS;
}

async function nextReapplyAt(application: { reviewedAt: Date | null; appliedAt: Date; updatedAt: Date }) {
  const cooldown = await rejectionCooldownDays();
  return addDays(application.reviewedAt || application.updatedAt || application.appliedAt, cooldown);
}

export async function loadAgentApplication(userId: string): Promise<ServiceResult<import("@reviewqr/shared").AgentApplicationStatus>> {
  const application = await prisma.agentApplication.findUnique({
    where: { userId },
    select: { status: true, rejectionReason: true, appliedAt: true, reviewedAt: true, updatedAt: true }
  });
  if (!application) return ok({ status: "none", rejectionReason: null, appliedAt: null, reapplyAt: null, canReapply: true });
  if (application.status === "REJECTED") {
    const reapplyAt = await nextReapplyAt(application);
    return ok({
      status: "rejected" as const,
      rejectionReason: application.rejectionReason,
      appliedAt: application.appliedAt.toISOString(),
      reapplyAt: reapplyAt.toISOString(),
      canReapply: reapplyAt.getTime() <= Date.now()
    });
  }
  return ok({
    status: application.status === "APPROVED" ? "approved" as const : "pending" as const,
    rejectionReason: null,
    appliedAt: application.appliedAt.toISOString(),
    reapplyAt: null,
    canReapply: false
  });
}

async function mayReapply(userId: string) {
  const existing = await prisma.agentApplication.findUnique({ where: { userId } });
  if (!existing) return { ok: true as const };
  if (existing.status === "PENDING") return { ok: false as const, error: "Your reseller application is already being reviewed" };
  if (existing.status === "APPROVED") return { ok: false as const, error: "You are already approved as a reseller" };
  const reapplyAt = await nextReapplyAt(existing);
  if (reapplyAt.getTime() > Date.now()) {
    return { ok: false as const, error: `You can apply again after ${reapplyAt.toISOString()}`, reapplyAt };
  }
  return { ok: true as const };
}

function applyData(input: AgentApplicationSubmit, status: "PENDING" | "APPROVED") {
  return {
    applicantName: input.name,
    phone: input.phone,
    city: input.city,
    state: input.state,
    howSell: input.howSell,
    experience: input.experience || "",
    languages: input.languages,
    referralOrTeamCode: input.referralOrTeamCode || "",
    termsVersion: RESELLER_TERMS_VERSION,
    termsAcceptedAt: new Date(),
    rejectionReason: null,
    reviewedById: null,
    reviewedAt: status === "APPROVED" ? new Date() : null,
    appliedAt: new Date(),
    status
  } as const;
}

async function notifyApplicant(userId: string, status: "approved" | "rejected", reason?: string) {
  const title = status === "approved" ? "You're a QR24x7 reseller" : "Reseller application update";
  const message = status === "approved"
    ? "Your reseller application is approved. Open your agent dashboard to get started."
    : `Your reseller application was not approved.${reason ? ` Reason: ${reason}` : ""}`;
  const link = status === "approved" ? "/(app)/agent-home" : "/(app)/agent-application";
  await prisma.notification.create({
    data: { userId, type: `agent_application_${status}`, title, message, link }
  });
  await sendPushToUsers([userId], { title, body: message, data: { type: `agent_application_${status}`, url: "qr24x7://agent", link } });
}

export async function applyForReseller(userId: string, input: AgentApplicationSubmit): Promise<ServiceResult<{ status: "PENDING" | "ACTIVE" }>> {
  const rate = await rateLimitDb({ key: `agent-apply:${userId}`, limit: 5, windowSeconds: 3600 });
  if (!rate.ok) return fail(429, "Too many application attempts");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, phone: true } });
  if (!user) return fail(404, "Account not found");
  if (user.role !== "USER" && user.role !== "AGENT") return fail(400, "This account cannot apply as a reseller");
  const cleanPhone = phoneKey(input.phone);
  if (!cleanPhone) return fail(400, "Enter a valid mobile number");
  if (user.phone && phoneKey(user.phone) !== cleanPhone) return fail(400, "Use the mobile number linked to your account");
  const allowed = await mayReapply(userId);
  if (!allowed.ok) return fail(409, allowed.error);

  const existingProfile = await prisma.agentProfile.findUnique({ where: { userId } });
  if (existingProfile && existingProfile.status !== "REJECTED") {
    return fail(409, "An agent profile already exists for this account");
  }

  const code = input.referralOrTeamCode.trim();
  if (code) {
    const joined = await joinTeam(userId, code, { allowRejectedReapply: true });
    if (!joined.ok) return joined;
    const status = joined.data.status === "ACTIVE" ? "APPROVED" : "PENDING";
    const values = applyData(input, status);
    try {
      await prisma.agentApplication.upsert({
        where: { userId },
        create: { userId, ...values },
        update: values
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return fail(409, "Your reseller application is already being reviewed");
      }
      throw error;
    }
    await prisma.agentProfile.update({ where: { userId }, data: { city: input.city } });
    if (status === "APPROVED") await notifyApplicant(userId, "approved");
    return ok({ status: status === "APPROVED" ? "ACTIVE" : "PENDING" });
  }

  const agentCode = existingProfile?.code || await freshAgentCode();
  const values = applyData(input, "PENDING");
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const repeated = await tx.agentApplication.findUnique({ where: { userId } });
      if (repeated?.status === "PENDING" || repeated?.status === "APPROVED") {
        throw new ApplicationConflict("Application already open");
      }
      const currentProfile = await tx.agentProfile.findUnique({ where: { userId }, select: { id: true, status: true } });
      if (currentProfile && currentProfile.status !== "REJECTED") throw new ApplicationConflict("Agent profile already exists");
      if (currentProfile) {
        await tx.agentProfile.update({
          where: { userId },
          data: { status: "PENDING", active: false, city: input.city, leaderId: null, sharePercent: null, depth: 1, pausedBy: null }
        });
      } else {
        await tx.agentProfile.create({ data: { userId, code: agentCode, city: input.city, upiId: "", status: "PENDING", active: false } });
      }
      await tx.agentApplication.upsert({ where: { userId }, create: { userId, ...values }, update: values });
    });
  } catch (error) {
    if (error instanceof ApplicationConflict || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      return fail(409, "Your reseller application is already being reviewed");
    }
    throw error;
  }
  return ok({ status: "PENDING" });
}

export async function loadPendingResellerApplications() {
  const rows = await prisma.agentApplication.findMany({
    where: { status: "PENDING" },
    orderBy: { appliedAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          createdAt: true,
          _count: { select: { businesses: true } }
        }
      }
    }
  });
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.applicantName,
    phone: row.phone,
    city: row.city,
    state: row.state,
    howSell: row.howSell,
    experience: row.experience,
    languages: row.languages,
    referralOrTeamCode: row.referralOrTeamCode,
    termsVersion: row.termsVersion,
    termsAcceptedAt: row.termsAcceptedAt.toISOString(),
    appliedAt: row.appliedAt.toISOString(),
    signupAt: row.user.createdAt.toISOString(),
    businessesOwned: row.user._count.businesses
  }));
}

export async function reviewResellerApplication(input: {
  applicationId: string;
  action: "approve" | "reject";
  actorId: string;
  reason?: string;
  leaderId?: string | null;
  sharePercent?: number | null;
}) {
  const application = await prisma.agentApplication.findUnique({ where: { id: input.applicationId } });
  if (!application || application.status !== "PENDING") return fail(404, "Pending application not found");
  if (input.action === "reject" && !input.reason?.trim()) return fail(400, "Enter a reason for rejection");

  let leader: { id: string; depth: number; leaderId: string | null; status: string; active: boolean } | null = null;
  let sharePercent: number | null = null;
  let depth = 1;
  if (input.action === "approve" && input.leaderId) {
    leader = await prisma.agentProfile.findUnique({ where: { id: input.leaderId }, select: { id: true, depth: true, leaderId: true, status: true, active: true } });
    const settings = await getTeamProgramSettings();
    if (!leader || leader.status !== "ACTIVE" || !leader.active || leader.depth >= settings.maxTeamDepth) return fail(400, "Choose an active leader who can accept a new member");
    depth = leader.depth + 1;
    if (depth > settings.maxTeamDepth) return fail(400, "This team cannot accept another level");
    const requested = input.sharePercent ?? settings.minSharePercent;
    if (requested < settings.minSharePercent || requested > settings.maxSharePercent) return fail(400, `Share must be between ${settings.minSharePercent} and ${settings.maxSharePercent}`);
    sharePercent = requested;
  }

  const now = new Date();
  const newStatus = input.action === "approve" ? "APPROVED" : "REJECTED";
  const profileStatus = input.action === "approve" ? "ACTIVE" : "REJECTED";
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "AgentApplication" WHERE "id" = ${application.id} FOR UPDATE`;
      const claimed = await tx.agentApplication.updateMany({
        where: { id: application.id, status: "PENDING" },
        data: {
          status: newStatus,
          rejectionReason: input.action === "reject" ? input.reason!.trim() : null,
          reviewedById: input.actorId,
          reviewedAt: now
        }
      });
      if (claimed.count !== 1) throw new Error("APPLICATION_ALREADY_REVIEWED");
      const profile = await tx.agentProfile.findUnique({ where: { userId: application.userId }, select: { id: true } });
      if (!profile) throw new Error("APPLICATION_PROFILE_MISSING");
      const profileData = input.action === "approve" && input.leaderId !== undefined
        ? {
            leaderId: input.leaderId,
            sharePercent: input.leaderId ? sharePercent : null,
            depth: input.leaderId ? depth : 1
          }
        : {};
      await tx.agentProfile.update({
        where: { id: profile.id },
        data: {
          status: profileStatus,
          active: input.action === "approve",
          pausedBy: null,
          ...profileData
        }
      });
      await tx.user.update({ where: { id: application.userId }, data: { role: input.action === "approve" ? "AGENT" : "USER", name: application.applicantName } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "APPLICATION_ALREADY_REVIEWED") return fail(409, "This application was already reviewed");
    if (error instanceof Error && error.message === "APPLICATION_PROFILE_MISSING") return fail(409, "Agent profile is missing");
    throw error;
  }
  await notifyApplicant(application.userId, input.action === "approve" ? "approved" : "rejected", input.reason);
  return ok({ status: newStatus, userId: application.userId, before: { status: "PENDING" }, after: { status: newStatus, reason: input.reason || null, leaderId: input.leaderId || null, sharePercent } });
}

function ruleView(rule: {
  agentId: string | null; planId: string | null; hardware: boolean; active: boolean;
  firstBasis: "PERCENT" | "FLAT"; firstPercent: number; firstFlatPaise: number;
  renewalBasis: "PERCENT" | "FLAT"; renewalPercent: number; renewalFlatPaise: number; renewalMonths: number | null;
}): CommissionRuleView { return rule; }

export async function loadResellerPitch() {
  const [plans, rules, checkout] = await Promise.all([
    prisma.plan.findMany({
      where: { active: true, visibleOnPricingPage: true },
      orderBy: { sortOrder: "asc" },
      include: { prices: { where: { active: true, duration: "MONTH_1" }, take: 1 } }
    }),
    prisma.commissionRule.findMany({ where: { active: true } }),
    getShopCheckoutConfig()
  ]);
  const planRules = rules.filter((rule) => !rule.hardware).map(ruleView);
  const shopRules = rules.filter((rule) => rule.hardware).map(ruleView);
  const growth = plans.find((plan) => /growth/i.test(plan.nameEn)) || plans[0];
  const growthPrice = growth?.prices[0]?.pricePaise || 0;
  const growthRule = growth ? pickCommissionRule(planRules, { agentId: "reseller-preview", planId: growth.id, hardware: false }) : null;
  const growthCommissionPaise = growthRule
    ? commissionAmount(growthRule.firstBasis, growthRule.firstPercent, growthRule.firstFlatPaise, growthPrice)
    : Math.round((growthPrice * checkout.commissionPercent) / 100);
  const shopRule = pickCommissionRule(shopRules, { agentId: "reseller-preview", planId: null, hardware: true });
  const planCommission = growthRule
    ? { basis: growthRule.firstBasis, percent: growthRule.firstPercent, flatPaise: growthRule.firstFlatPaise }
    : { basis: "PERCENT" as const, percent: checkout.commissionPercent, flatPaise: 0 };
  const shopCommission = shopRule
    ? { basis: shopRule.firstBasis, percent: shopRule.firstPercent, flatPaise: shopRule.firstFlatPaise }
    : { basis: "PERCENT" as const, percent: checkout.commissionPercent, flatPaise: 0 };
  return {
    planCommission,
    shopCommission,
    growthPlanName: growth?.nameEn || "Growth",
    growthPlanNameHi: growth?.nameHi || "ग्रोथ",
    growthExampleMonthlyPaise: growthCommissionPaise * 10,
    payoutMethod: "UPI"
  };
}
