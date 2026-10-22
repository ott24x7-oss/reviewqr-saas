import type { PlanDuration, SubscriptionTier } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { DURATIONS, cleanModules, parseLimits, slugifyPlan } from "./catalog";
import { planCategory } from "./categories";
import { limitsForTier } from "./legacy";

const tiers = ["FREE", "STARTER", "GROWTH", "AGENCY", "FOUNDER"] as const;

const priceSchema = z.object({
  duration: z.enum(["MONTH_1", "MONTH_6", "YEAR_1", "LIFETIME"]),
  pricePaise: z.number().int().min(0).max(100_000_000),
  mrpPaise: z.number().int().min(0).max(100_000_000).nullable().optional(),
  active: z.boolean()
});

export const planWriteSchema = z.object({
  nameEn: z.string().trim().min(1).max(80),
  nameHi: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(48).optional(),
  descriptionEn: z.string().max(500).optional(),
  descriptionHi: z.string().max(500).optional(),
  modules: z.array(z.string()).min(1),
  limits: z.object({
    businesses: z.number().int().min(0),
    qrCodes: z.number().int().min(0),
    products: z.number().int().min(0),
    staff: z.number().int().min(0),
    aiCalls: z.number().int().min(0)
  }),
  badge: z.string().max(40).nullable().optional(),
  category: z.enum(["reviews", "menu", "store", "profile", "combo"]).default("reviews"),
  imageUrl: z.string().max(2_000_000).optional().default(""),
  active: z.boolean(),
  visibleOnPricingPage: z.boolean(),
  legacyTier: z.enum(tiers),
  prices: z.array(priceSchema).max(4)
});

export type PlanWriteInput = z.infer<typeof planWriteSchema>;

async function uniqueSlug(base: string, ignoreId?: string) {
  let slug = slugifyPlan(base);
  let n = 2;
  while (true) {
    const found = await prisma.plan.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === ignoreId) return slug;
    slug = `${slugifyPlan(base).slice(0, 44)}-${n}`;
    n += 1;
    if (n > 50) return `${slugifyPlan(base).slice(0, 40)}-${Date.now().toString(36)}`;
  }
}

async function limitsFor(input: PlanWriteInput) {
  const base = await limitsForTier(input.legacyTier);
  return parseLimits(
    {
      ...base,
      businesses: input.limits.businesses,
      qrCodes: input.limits.qrCodes,
      products: input.limits.products,
      staff: input.limits.staff,
      aiCalls: input.limits.aiCalls,
      storeProducts: input.limits.products,
      aiCallsPerMonth: input.limits.aiCalls
    },
    base
  );
}

function priceRows(prices: PlanWriteInput["prices"]) {
  return DURATIONS.map((duration) => {
    const row = prices.find((price) => price.duration === duration);
    return {
      duration,
      pricePaise: row?.pricePaise ?? 0,
      mrpPaise: row?.mrpPaise ?? null,
      active: row?.active ?? false
    };
  });
}

export async function createPlanRecord(input: PlanWriteInput) {
  const modules = cleanModules(input.modules);
  if (!modules.length) return { ok: false as const, error: "Tick at least one module" };
  const slug = await uniqueSlug(input.slug || input.nameEn);
  const sort = await prisma.plan.aggregate({ _max: { sortOrder: true } });
  const plan = await prisma.plan.create({
    data: {
      nameEn: input.nameEn,
      nameHi: input.nameHi,
      slug,
      descriptionEn: input.descriptionEn || "",
      descriptionHi: input.descriptionHi || "",
      modules,
      limits: await limitsFor(input),
      badge: input.badge?.trim() || null,
      category: planCategory(input.category),
      imageUrl: input.imageUrl.trim(),
      sortOrder: (sort._max.sortOrder ?? 0) + 1,
      active: input.active,
      visibleOnPricingPage: input.visibleOnPricingPage,
      legacyTier: input.legacyTier as SubscriptionTier,
      prices: { create: priceRows(input.prices) }
    },
    include: { prices: true }
  });
  return { ok: true as const, plan };
}

export async function updatePlanRecord(id: string, input: PlanWriteInput) {
  const modules = cleanModules(input.modules);
  if (!modules.length) return { ok: false as const, error: "Tick at least one module" };
  const current = await prisma.plan.findUnique({ where: { id }, select: { id: true } });
  if (!current) return { ok: false as const, error: "Plan not found" };
  const slug = await uniqueSlug(input.slug || input.nameEn, id);
  const plan = await prisma.plan.update({
    where: { id },
    data: {
      nameEn: input.nameEn,
      nameHi: input.nameHi,
      slug,
      descriptionEn: input.descriptionEn || "",
      descriptionHi: input.descriptionHi || "",
      modules,
      limits: await limitsFor(input),
      badge: input.badge?.trim() || null,
      category: planCategory(input.category),
      imageUrl: input.imageUrl.trim(),
      active: input.active,
      visibleOnPricingPage: input.visibleOnPricingPage,
      legacyTier: input.legacyTier as SubscriptionTier
    }
  });
  for (const row of priceRows(input.prices)) {
    await prisma.planPrice.upsert({
      where: { planId_duration: { planId: id, duration: row.duration } },
      create: { planId: id, ...row },
      update: { pricePaise: row.pricePaise, mrpPaise: row.mrpPaise, active: row.active }
    });
  }
  return { ok: true as const, plan };
}

export async function archivePlan(id: string) {
  const plan = await prisma.plan.update({
    where: { id },
    data: { active: false, visibleOnPricingPage: false }
  });
  return plan;
}

export async function duplicatePlan(id: string) {
  const source = await prisma.plan.findUnique({ where: { id }, include: { prices: true } });
  if (!source) return { ok: false as const, error: "Plan not found" };
  const sort = await prisma.plan.aggregate({ _max: { sortOrder: true } });
  const slug = await uniqueSlug(`${source.slug}-copy`);
  const plan = await prisma.plan.create({
    data: {
      nameEn: `${source.nameEn} copy`,
      nameHi: source.nameHi,
      slug,
      descriptionEn: source.descriptionEn,
      descriptionHi: source.descriptionHi,
      modules: source.modules,
      limits: source.limits as object,
      badge: source.badge,
      category: source.category,
      imageUrl: source.imageUrl,
      sortOrder: (sort._max.sortOrder ?? 0) + 1,
      active: true,
      visibleOnPricingPage: false,
      legacyTier: source.legacyTier,
      prices: {
        create: source.prices.map((price) => ({
          duration: price.duration,
          pricePaise: price.pricePaise,
          mrpPaise: price.mrpPaise,
          active: price.active
        }))
      }
    },
    include: { prices: true }
  });
  return { ok: true as const, plan };
}

export async function reorderPlans(ids: string[]) {
  const unique = [...new Set(ids)];
  await prisma.$transaction(
    unique.map((id, index) => prisma.plan.update({ where: { id }, data: { sortOrder: index } }))
  );
}

export type SavedPrice = { duration: PlanDuration; pricePaise: number; mrpPaise: number | null; active: boolean };
