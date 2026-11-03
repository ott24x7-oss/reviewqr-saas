import type { FeatureId } from "@reviewqr/shared";
import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { featureBlock } from "../plans/feature-gate";
import { rateLimitDb } from "../rate-limit";
import { planOwner, requireBusinessRole } from "../tenant";
import { ownerLimitError } from "../entitlements";
import { sendWhatsApp } from "../whatsapp";
import { hashToken, randomToken } from "../tokens";
import { absoluteUrl, slugify } from "../utils";
import { escapeHtml, sendEmail } from "../email";
import { cappedRewardMonths, hasActivePaidPlan } from "../plans/referral";
import { buildOwnerReferralShareText } from "./referral-copy";
import { getPlanProgramSettings } from "../plans/settings";
import { extendByReward } from "../plans/quote";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type LimitKey = Parameters<typeof ownerLimitError>[1];

/** Same plan caps as the web routes: counted across every business of the owner. */
async function limitFor(userId: string, ownerId: string, key: LimitKey, used: number) {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, subscriptionTier: true, subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true }
  });
  const owner = actor ? await planOwner(actor, ownerId) : null;
  if (!owner) return "Not found";
  return ownerLimitError(owner, key, used);
}

/** Free-text WhatsApp sends from the platform number stay off until template-only sending ships. */
export function campaignSendEnabled() {
  return process.env.CAMPAIGN_SEND_ENABLED === "1";
}

export function campaignMessage(template: string, name: string) {
  const who = name.trim().slice(0, 80) || "there";
  return template.replaceAll("{name}", who).trim().slice(0, 1000);
}

async function openFeature(userId: string, businessId: string, level: "read" | "manage", feature: FeatureId) {
  const access = await requireBusinessRole(userId, businessId, level);
  if (!access) return fail(404, "Not found");
  const blocked = await featureBlock(access.ownerId, feature);
  if (blocked) return blocked;
  return access;
}

export async function listReviews(userId: string, businessId: string, rating?: string | null) {
  const access = await openFeature(userId, businessId, "read", "reviews-log");
  if (!("id" in access)) return access;
  const score = rating ? Number(rating) : null;
  if (rating && (!Number.isInteger(score) || (score || 0) < 1 || (score || 0) > 5)) return fail(400, "Pick a rating from 1 to 5");
  const items = await prisma.review.findMany({
    where: { businessId: access.id, ...(score ? { rating: score } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      rating: true,
      redirected: true,
      source: true,
      customerName: true,
      createdAt: true,
      staff: { select: { name: true } },
      location: { select: { name: true } }
    }
  });
  return ok({
    items: items.map((row) => ({
      id: row.id,
      rating: row.rating,
      redirected: row.redirected,
      source: row.source,
      customerName: row.customerName || "",
      staff: row.staff?.name || "",
      location: row.location?.name || "",
      createdAt: row.createdAt.toISOString()
    }))
  });
}

export async function listTestimonials(userId: string, businessId: string) {
  const access = await openFeature(userId, businessId, "read", "testimonials");
  if (!("id" in access)) return access;
  const items = await prisma.testimonial.findMany({
    where: { businessId: access.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return ok({
    items: items.map((row) => ({
      id: row.id,
      authorName: row.authorName,
      rating: row.rating,
      message: row.message,
      isPublic: row.isPublic
    }))
  });
}

export async function setTestimonialPublic(userId: string, businessId: string, id: string, isPublic: boolean) {
  const access = await openFeature(userId, businessId, "manage", "testimonials");
  if (!("id" in access)) return access;
  const updated = await prisma.testimonial.updateMany({
    where: { id, businessId: access.id },
    data: { isPublic, isApproved: isPublic }
  });
  if (!updated.count) return fail(404, "Not found");
  return ok({ id, isPublic });
}

export async function listHints(userId: string, businessId: string) {
  const access = await openFeature(userId, businessId, "read", "reviews-log");
  if (!("id" in access)) return access;
  const items = await prisma.reviewTemplate.findMany({
    where: { businessId: access.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, content: true }
  });
  return ok({ items });
}

export async function addHint(userId: string, businessId: string, content: string) {
  const access = await openFeature(userId, businessId, "manage", "reviews-log");
  if (!("id" in access)) return access;
  const text = content.trim();
  if (text.length < 2 || text.length > 280) return fail(400, "Write a short topic hint");
  const used = await prisma.reviewTemplate.count({ where: { business: { ownerId: access.ownerId } } });
  const limit = await limitFor(userId, access.ownerId, "reviewTemplates", used);
  if (limit) return fail(402, limit);
  const row = await prisma.reviewTemplate.create({ data: { businessId: access.id, content: text } });
  return ok({ id: row.id, content: row.content });
}

export async function removeHint(userId: string, businessId: string, id: string) {
  const access = await openFeature(userId, businessId, "manage", "reviews-log");
  if (!("id" in access)) return access;
  await prisma.reviewTemplate.deleteMany({ where: { id, businessId: access.id } });
  return ok({ id });
}

export async function listLocations(userId: string, businessId: string) {
  const access = await openFeature(userId, businessId, "read", "locations");
  if (!("id" in access)) return access;
  const items = await prisma.location.findMany({
    where: { businessId: access.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true }
  });
  return ok({ items });
}

export async function addLocation(userId: string, businessId: string, name: string, city: string) {
  const access = await openFeature(userId, businessId, "manage", "locations");
  if (!("id" in access)) return access;
  const label = name.trim();
  if (label.length < 2) return fail(400, "Name the location");
  const used = await prisma.location.count({ where: { business: { ownerId: access.ownerId }, isActive: true } });
  const limit = await limitFor(userId, access.ownerId, "locations", used);
  if (limit) return fail(402, limit);
  const row = await prisma.location.create({
    data: { businessId: access.id, name: label, city: city.trim() || null, slug: `${slugify(label)}-${Date.now().toString(36)}` }
  });
  return ok({ id: row.id, name: row.name, city: row.city || "" });
}

export async function listCampaigns(userId: string, businessId: string) {
  const access = await openFeature(userId, businessId, "read", "campaigns");
  if (!("id" in access)) return access;
  const items = await prisma.campaign.findMany({
    where: { businessId: access.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, name: true, status: true, sent: true, whatsappTemplate: true }
  });
  return ok({ items });
}

export async function createCampaign(userId: string, businessId: string, name: string, template: string) {
  const access = await openFeature(userId, businessId, "manage", "campaigns");
  if (!("id" in access)) return access;
  const title = name.trim();
  const text = template.trim();
  if (title.length < 2) return fail(400, "Name the campaign");
  if (text.length < 2) return fail(400, "Write the WhatsApp message");
  const used = await prisma.campaign.count({ where: { business: { ownerId: access.ownerId } } });
  const limit = await limitFor(userId, access.ownerId, "campaigns", used);
  if (limit) return fail(402, limit);
  const row = await prisma.campaign.create({
    data: { businessId: access.id, name: title.slice(0, 80), whatsappTemplate: text.slice(0, 1000), status: "DRAFT" }
  });
  return ok({ id: row.id });
}

export async function sendCampaign(userId: string, businessId: string, campaignId: string) {
  const access = await openFeature(userId, businessId, "manage", "campaigns");
  if (!("id" in access)) return access;
  if (!campaignSendEnabled()) return fail(403, "Sending campaigns from the app is not available yet");
  const gate = await rateLimitDb({ key: `campaign-send:${access.id}`, limit: 3, windowSeconds: 3600 });
  if (!gate.ok) return fail(429, "Too many campaign sends. Try again later.");
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, businessId: access.id } });
  if (!campaign?.whatsappTemplate) return fail(400, "Write the WhatsApp message first");
  const [reviewPhones, orderPhones] = await Promise.all([
    prisma.review.findMany({
      where: { businessId: access.id, consentAt: { not: null }, NOT: { customerPhone: null } },
      select: { customerPhone: true },
      take: 200
    }),
    prisma.menuOrder.findMany({
      where: { businessId: access.id, consentAt: { not: null }, NOT: { customerPhone: null } },
      select: { customerPhone: true },
      take: 200
    })
  ]);
  const allowed = new Set(
    [...reviewPhones, ...orderPhones].map((row) => row.customerPhone).filter((phone): phone is string => !!phone)
  );
  const contacts = await prisma.contact.findMany({
    where: {
      businessId: access.id,
      phone: { in: [...allowed] },
      campaigns: { none: { campaignId: campaign.id, sentAt: { not: null } } }
    },
    select: { id: true, name: true, phone: true },
    take: 30
  });
  let sent = 0;
  for (const contact of contacts) {
    if (!contact.phone) continue;
    const message = campaignMessage(campaign.whatsappTemplate, contact.name || "");
    if (!message) continue;
    const result = await sendWhatsApp({ to: contact.phone, message });
    if (!result.ok || result.via === "click-to-chat") continue;
    await prisma.campaignContact.upsert({
      where: { campaignId_contactId: { campaignId: campaign.id, contactId: contact.id } },
      create: { campaignId: campaign.id, contactId: contact.id, sentAt: new Date() },
      update: { sentAt: new Date() }
    });
    sent += 1;
  }
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { sent: { increment: sent }, status: sent ? "COMPLETED" : campaign.status, startedAt: sent ? new Date() : campaign.startedAt }
  });
  return ok({ sent, skipped: contacts.length - sent });
}

export async function ownerReferHome(userId: string) {
  const { ensureOwnerReferral } = await import("../plans/owner-referral");
  const referral = await ensureOwnerReferral(userId);
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const nextYear = new Date(now.getFullYear() + 1, 0, 1);
  const [settings, user, subscription, credit, earned, referrals] = await Promise.all([
    getPlanProgramSettings(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, subscriptionStatus: true, subscriptionEndsAt: true }
    }),
    prisma.subscription.findFirst({
      where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
      select: { endsAt: true }
    }),
    prisma.referralCredit.findUnique({ where: { userId }, select: { months: true, days: true } }),
    prisma.referralReward.aggregate({
      where: { referrerUserId: userId, status: "APPLIED", appliedAt: { gte: yearStart, lt: nextYear } },
      _sum: { months: true }
    }),
    prisma.signupAttribution.findMany({
      where: { referrerUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            phone: true,
            businesses: { select: { name: true }, orderBy: { createdAt: "asc" }, take: 1 },
            referralRewardReceived: {
              select: { status: true, months: true, holdUntil: true, appliedAt: true }
            }
          }
        }
      }
    })
  ]);
  const currentEndsAt = subscription?.endsAt ?? user?.subscriptionEndsAt ?? null;
  const monthsEarnedThisYear = earned._sum.months || 0;
  const activePaidPlan = Boolean(user && hasActivePaidPlan({
    tier: user.subscriptionTier,
    status: user.subscriptionStatus,
    endsAt: currentEndsAt,
    now
  }));
  const pending = referrals
    .map((row) => row.user.referralRewardReceived)
    .filter((reward) => reward?.status === "PENDING")
    .sort((a, b) => (a?.holdUntil.getTime() ?? 0) - (b?.holdUntil.getTime() ?? 0));
  let usedMonths = monthsEarnedThisYear;
  let pendingMonths = 0;
  for (const reward of pending) {
    if (!reward) continue;
    const applied = cappedRewardMonths(reward.months, usedMonths, settings.maxMonthsPerYear);
    pendingMonths += applied;
    usedMonths += applied;
  }
  const projected = activePaidPlan && currentEndsAt && pendingMonths > 0
    ? extendByReward(currentEndsAt, pendingMonths, 0)
    : null;
  const code = referral.code;
  const link = absoluteUrl(`/refer/${code}`);
  // The promotional amount is the largest configured reward. Each referred plan's actual amount appears in its progress row.
  const monthsPerReferral = Math.max(0, ...Object.values(settings.monthsByDuration));
  const bonusDaysForFriend = settings.newBusinessDays;
  const shareText = buildOwnerReferralShareText(link, bonusDaysForFriend, monthsPerReferral);
  return ok({
    code,
    link,
    shareText,
    monthsPerReferral,
    bonusDaysForFriend,
    holdDays: settings.holdDays,
    maxMonthsPerYear: settings.maxMonthsPerYear,
    monthsEarnedThisYear,
    currentEndsAt: currentEndsAt?.toISOString() ?? null,
    projectedEndsAt: projected?.toISOString() ?? null,
    creditMonths: credit?.months ?? 0,
    creditDays: credit?.days ?? 0,
    referrals: referrals.map((row) => {
      const reward = row.user.referralRewardReceived;
      const businessName = row.user.businesses[0]?.name || "";
      return {
        id: row.id,
        displayName: safeReferralDisplay(businessName, row.user.phone),
        stage: reward?.status === "PENDING"
          ? "PAID"
          : reward?.status === "APPLIED"
            ? "REWARD_ADDED"
            : reward?.status === "REVERSED"
              ? "REVERSED"
              : "SIGNED_UP",
        months: reward?.months ?? 0,
        signedUpAt: row.createdAt.toISOString(),
        availableOn: reward?.status === "PENDING" ? reward.holdUntil.toISOString() : null,
        appliedAt: reward?.appliedAt?.toISOString() ?? null
      };
    })
  });
}

function safeReferralDisplay(businessName: string, phone: string | null) {
  const phoneDigits = phone?.replace(/\D/g, "") || "";
  const maskedPhone = phoneDigits.length > 4 ? `•••• ${phoneDigits.slice(-4)}` : "New business";
  const safeName = businessName
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, (value) => (value.replace(/\D/g, "").length >= 10 ? "" : value))
    .replace(/\s{2,}/g, " ")
    .trim();
  return safeName && !/^[\d\s+().-]+$/.test(safeName) ? safeName : maskedPhone;
}

export async function readAiSettings(userId: string, businessId: string) {
  const access = await openFeature(userId, businessId, "read", "ai-replies");
  if (!("id" in access)) return access;
  const row = await prisma.business.findUnique({
    where: { id: access.id },
    select: { aiReviewsEnabled: true, services: true }
  });
  return ok({ enabled: !!row?.aiReviewsEnabled, services: row?.services || "" });
}

export async function saveAiSettings(userId: string, businessId: string, enabled: boolean, services: string) {
  const access = await openFeature(userId, businessId, "manage", "ai-replies");
  if (!("id" in access)) return access;
  await prisma.business.update({
    where: { id: access.id },
    data: { aiReviewsEnabled: enabled, services: services.trim().slice(0, 500) }
  });
  return ok({ enabled });
}

export async function updateStaff(userId: string, businessId: string, staffId: string, name: string) {
  const access = await openFeature(userId, businessId, "manage", "staff");
  if (!("id" in access)) return access;
  const label = name.trim();
  if (label.length < 2) return fail(400, "Name the person");
  const updated = await prisma.staff.updateMany({ where: { id: staffId, businessId: access.id }, data: { name: label } });
  if (!updated.count) return fail(404, "Not found");
  return ok({ id: staffId, name: label });
}

export async function removeStaff(userId: string, businessId: string, staffId: string) {
  const access = await openFeature(userId, businessId, "manage", "staff");
  if (!("id" in access)) return access;
  await prisma.staff.updateMany({ where: { id: staffId, businessId: access.id }, data: { isActive: false } });
  return ok({ id: staffId });
}

export async function staffStats(userId: string, businessId: string, staffId: string) {
  const access = await openFeature(userId, businessId, "read", "staff");
  if (!("id" in access)) return access;
  const reviews = await prisma.review.count({ where: { businessId: access.id, staffId } });
  return ok({ reviews });
}

export async function inviteStaff(userId: string, businessId: string, email: string) {
  // Owner only, like the web members route.
  const access = await openFeature(userId, businessId, "manage", "staff");
  if (!("id" in access)) return access;
  if (access.ownerId !== userId) return fail(404, "Not found");
  const gate = await rateLimitDb({ key: `invite:${userId}`, limit: 20, windowSeconds: 3600 });
  if (!gate.ok) return fail(429, "Too many invites");
  const to = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail(400, "Enter an email");
  const token = randomToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await prisma.businessInvite.deleteMany({ where: { businessId: access.id, email: to, acceptedAt: null } });
  await prisma.businessInvite.create({
    data: { businessId: access.id, email: to, role: "STAFF", tokenHash: hashToken(token), expiresAt }
  });
  const url = absoluteUrl(`/invite/${token}`);
  await sendEmail({
    to,
    subject: `Join ${access.name.replace(/\s+/g, " ").slice(0, 80)} on QR24x7`,
    html: `<p>You are invited to ${escapeHtml(access.name)} as staff.</p><p><a href="${escapeHtml(url)}">Accept invite</a></p>`
  });
  return ok({ sent: true });
}
