import crypto from "crypto";
import { prisma } from "../db";
import { hasModule } from "../plans/entitlements";
import { scanSalt } from "../scans";
import { hoursFromPublished } from "../tap/links";
import { addIstDays, istDayKey, istDayStart, istDaysEnding } from "../analytics/ist";
import { ensureRollups } from "../analytics/build";
import { businessAgeDays, scoreGrowth, type GrowthInput } from "./score";
import { setupChecklist } from "./setup";

function linksFrom(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const links = (value as { links?: unknown }).links;
  return Array.isArray(links) ? links : [];
}

function linkCount(value: unknown) {
  return linksFrom(value).length;
}

function buttonCount(value: unknown) {
  return linksFrom(value).filter((link) => {
    if (!link || typeof link !== "object") return false;
    return (link as { enabled?: boolean }).enabled !== false;
  }).length;
}

function hasHours(published: unknown, storeHours: unknown) {
  if (hoursFromPublished(published)) return true;
  if (storeHours && typeof storeHours === "object" && !Array.isArray(storeHours)) {
    return Object.keys(storeHours).length > 0;
  }
  return false;
}

function phoneKey(phone: string) {
  return crypto.createHash("sha256").update(`${scanSalt()}|order-phone|${phone}`).digest("hex");
}

export async function computeGrowth(businessId: string, now = new Date()) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      address: true,
      city: true,
      logo: true,
      ownerId: true,
      createdAt: true,
      archived: true,
      tapPage: { select: { published: true, draft: true } },
      storeSettings: { select: { hours: true, upiId: true } }
    }
  });
  if (!business || business.archived) return null;
  const today = istDayKey(now);
  const from = addIstDays(today, -13);
  const [menuOn, storeOn, days, feedbacks, orders, menuItems, doneRows, historyRows, scannedCodes] = await Promise.all([
    hasModule(business.ownerId, "MENU"),
    hasModule(business.ownerId, "STORE"),
    ensureRollups(business.id, from, today),
    prisma.feedback.findMany({
      where: { businessId, createdAt: { gte: istDayStart(addIstDays(today, -29)) } },
      select: { status: true }
    }),
    prisma.menuOrder.findMany({
      where: { businessId, createdAt: { gte: istDayStart(addIstDays(today, -29)) } },
      select: { customerPhone: true }
    }),
    prisma.menuItem.count({ where: { businessId, available: true } }),
    prisma.growthTipDone.findMany({ where: { businessId }, select: { tipKey: true } }),
    prisma.growthScore.findMany({
      where: { businessId },
      orderBy: { day: "desc" },
      take: 30,
      select: { day: true, score: true }
    }),
    prisma.qRCode.count({ where: { businessId, scans: { gt: 0 } } })
  ]);
  const createdKey = istDayKey(business.createdAt);
  const lived = days.filter((day) => day.day >= createdKey);
  const last7 = new Set(istDaysEnding(today, 7));
  const prev7 = new Set(istDaysEnding(addIstDays(today, -7), 7));
  const sum = (keys: Set<string>, pick: (day: (typeof lived)[number]) => number) =>
    lived.filter((day) => keys.has(day.day)).reduce((total, day) => total + pick(day), 0);
  const ratingCount = sum(last7, (day) => day.ratingCount);
  const ratingSum = sum(last7, (day) => day.ratingSum);
  const phones = new Map<string, number>();
  for (const order of orders) {
    const phone = (order.customerPhone || "").replace(/\D/g, "");
    if (phone.length < 8) continue;
    const key = phoneKey(phone);
    phones.set(key, (phones.get(key) || 0) + 1);
  }
  let repeatCustomers = 0;
  for (const count of phones.values()) if (count >= 2) repeatCustomers += 1;
  phones.clear();

  const published = business.tapPage?.published ?? business.tapPage?.draft;
  const input: GrowthInput = {
    businessId: business.id,
    ageDays: businessAgeDays(business.createdAt, now),
    storeOn,
    menuOn,
    reviewsLast7: sum(last7, (day) => day.ratingCount),
    reviewsPrev7: sum(prev7, (day) => day.ratingCount),
    avgRating: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    ratingCount,
    feedbackTotal: feedbacks.length,
    feedbackReplied: feedbacks.filter((row) => row.status !== "NEW").length,
    hasLogo: !!(business.logo && business.logo.trim()),
    hasHours: hasHours(published, business.storeSettings?.hours),
    linkCount: Math.max(linkCount(business.tapPage?.published), linkCount(business.tapPage?.draft)),
    hasMenu: menuItems > 0,
    orderCount: storeOn ? orders.length : 0,
    repeatCustomers: storeOn ? repeatCustomers : 0,
    scansLast7: sum(last7, (day) => day.scans),
    scansPrev7: sum(prev7, (day) => day.scans),
    doneTips: doneRows.map((row) => row.tipKey)
  };
  const scored = scoreGrowth(input);
  if (scored.ready && scored.score != null) {
    const day = new Date(`${today}T00:00:00.000Z`);
    await prisma.growthScore.upsert({
      where: { businessId_day: { businessId, day } },
      create: { businessId, day, score: scored.score, parts: scored.components },
      update: { score: scored.score, parts: scored.components }
    });
  }
  const filled = [business.phone, business.address, business.city].some(
    (value) => typeof value === "string" && value.trim().length > 0
  );
  return {
    businessId: business.id,
    businessName: business.name,
    ...scored,
    setup: setupChecklist({
      hasDetails: filled,
      hasLink: business.slug.trim().length > 0,
      hasMenu: menuItems > 0,
      menuOn,
      hasButtons: Math.max(buttonCount(business.tapPage?.published), buttonCount(business.tapPage?.draft)) > 0,
      hasHours: hasHours(published, business.storeSettings?.hours),
      hasUpi: Boolean(business.storeSettings?.upiId?.trim()),
      printed: scannedCodes > 0
    }),
    history: historyRows
      .map((row) => ({ day: row.day.toISOString().slice(0, 10), score: row.score }))
      .reverse()
  };
}

export async function scoreAllBusinesses(now = new Date()) {
  const businesses = await prisma.business.findMany({
    where: { archived: false },
    select: { id: true }
  });
  for (const business of businesses) await computeGrowth(business.id, now);
  return businesses.length;
}

export async function markGrowthTip(businessId: string, tipKey: string) {
  const key = tipKey.trim().slice(0, 40);
  if (!key) return { ok: false as const, error: "Missing tip" };
  await prisma.growthTipDone.upsert({
    where: { businessId_tipKey: { businessId, tipKey: key } },
    create: { businessId, tipKey: key },
    update: {}
  });
  return { ok: true as const };
}
