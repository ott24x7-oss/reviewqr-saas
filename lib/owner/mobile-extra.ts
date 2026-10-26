import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { rateLimitDb } from "../rate-limit";
import { planOwner, requireBusinessRole } from "../tenant";
import { ownerLimitError } from "../entitlements";
import { sendWhatsApp } from "../whatsapp";
import { hashToken, randomToken } from "../tokens";
import { absoluteUrl, slugify } from "../utils";
import { escapeHtml, sendEmail } from "../email";

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

export async function listReviews(userId: string, businessId: string, rating?: string | null) {
  const access = await requireBusinessRole(userId, businessId, "read");
  if (!access) return fail(404, "Not found");
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
  const access = await requireBusinessRole(userId, businessId, "read");
  if (!access) return fail(404, "Not found");
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
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
  const updated = await prisma.testimonial.updateMany({
    where: { id, businessId: access.id },
    data: { isPublic, isApproved: isPublic }
  });
  if (!updated.count) return fail(404, "Not found");
  return ok({ id, isPublic });
}

export async function listHints(userId: string, businessId: string) {
  const access = await requireBusinessRole(userId, businessId, "read");
  if (!access) return fail(404, "Not found");
  const items = await prisma.reviewTemplate.findMany({
    where: { businessId: access.id },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, content: true }
  });
  return ok({ items });
}

export async function addHint(userId: string, businessId: string, content: string) {
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
  const text = content.trim();
  if (text.length < 2 || text.length > 280) return fail(400, "Write a short topic hint");
  const used = await prisma.reviewTemplate.count({ where: { business: { ownerId: access.ownerId } } });
  const limit = await limitFor(userId, access.ownerId, "reviewTemplates", used);
  if (limit) return fail(402, limit);
  const row = await prisma.reviewTemplate.create({ data: { businessId: access.id, content: text } });
  return ok({ id: row.id, content: row.content });
}

export async function removeHint(userId: string, businessId: string, id: string) {
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
  await prisma.reviewTemplate.deleteMany({ where: { id, businessId: access.id } });
  return ok({ id });
}

export async function listLocations(userId: string, businessId: string) {
  const access = await requireBusinessRole(userId, businessId, "read");
  if (!access) return fail(404, "Not found");
  const items = await prisma.location.findMany({
    where: { businessId: access.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, city: true }
  });
  return ok({ items });
}

export async function addLocation(userId: string, businessId: string, name: string, city: string) {
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
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
  const access = await requireBusinessRole(userId, businessId, "read");
  if (!access) return fail(404, "Not found");
  const items = await prisma.campaign.findMany({
    where: { businessId: access.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, name: true, status: true, sent: true, whatsappTemplate: true }
  });
  return ok({ items });
}

export async function createCampaign(userId: string, businessId: string, name: string, template: string) {
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
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
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
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
  const row = await ensureOwnerReferral(userId);
  const rewards = await prisma.referralReward.findMany({
    where: { referrerUserId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, months: true, createdAt: true }
  });
  const code = row.code;
  return ok({
    code,
    link: absoluteUrl(`/refer/${code}`),
    rewards: rewards.map((reward) => ({ id: reward.id, months: reward.months, at: reward.createdAt.toISOString() }))
  });
}

export async function readAiSettings(userId: string, businessId: string) {
  const access = await requireBusinessRole(userId, businessId, "read");
  if (!access) return fail(404, "Not found");
  const row = await prisma.business.findUnique({
    where: { id: access.id },
    select: { aiReviewsEnabled: true, services: true }
  });
  return ok({ enabled: !!row?.aiReviewsEnabled, services: row?.services || "" });
}

export async function saveAiSettings(userId: string, businessId: string, enabled: boolean, services: string) {
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
  await prisma.business.update({
    where: { id: access.id },
    data: { aiReviewsEnabled: enabled, services: services.trim().slice(0, 500) }
  });
  return ok({ enabled });
}

export async function updateStaff(userId: string, businessId: string, staffId: string, name: string) {
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
  const label = name.trim();
  if (label.length < 2) return fail(400, "Name the person");
  const updated = await prisma.staff.updateMany({ where: { id: staffId, businessId: access.id }, data: { name: label } });
  if (!updated.count) return fail(404, "Not found");
  return ok({ id: staffId, name: label });
}

export async function removeStaff(userId: string, businessId: string, staffId: string) {
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access) return fail(404, "Not found");
  await prisma.staff.updateMany({ where: { id: staffId, businessId: access.id }, data: { isActive: false } });
  return ok({ id: staffId });
}

export async function staffStats(userId: string, businessId: string, staffId: string) {
  const access = await requireBusinessRole(userId, businessId, "read");
  if (!access) return fail(404, "Not found");
  const reviews = await prisma.review.count({ where: { businessId: access.id, staffId } });
  return ok({ reviews });
}

export async function inviteStaff(userId: string, businessId: string, email: string) {
  // Owner only, like the web members route.
  const access = await requireBusinessRole(userId, businessId, "manage");
  if (!access || access.ownerId !== userId) return fail(404, "Not found");
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
