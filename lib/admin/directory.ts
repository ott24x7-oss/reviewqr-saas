import type { Prisma, ReferralRewardStatus, SubscriptionStatus, SubscriptionTier, UserRole } from "@prisma/client";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { maskPhone } from "./mask";

export const EXPORT_CAP = 2000;

const ROLES = ["USER", "ADMIN", "AGENCY", "STAFF", "AGENT"] as const;
const TIERS = ["FREE", "STARTER", "GROWTH", "AGENCY"] as const;
const SUB_STATUS = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"] as const;
const REWARD_STATUS = ["PENDING", "APPLIED", "REVERSED"] as const;

type Mode = "page" | "export";

export function readOffset(search: URLSearchParams, mode: Mode = "page") {
  const limitRaw = search.get("limit");
  const pageRaw = search.get("page") || "1";
  if (limitRaw != null && limitRaw !== "" && !/^\d+$/.test(limitRaw)) return fail(400, "limit must be a number");
  if (!/^\d+$/.test(pageRaw)) return fail(400, "page must be a number");
  const requested = limitRaw ? Number(limitRaw) : mode === "export" ? EXPORT_CAP : 20;
  if (requested < 1) return fail(400, "limit must be at least 1");
  const limit = mode === "export" ? Math.min(requested, EXPORT_CAP) : Math.min(requested, 100);
  const page = Math.max(1, Number(pageRaw));
  const skip = mode === "export" ? 0 : (page - 1) * limit;
  if (skip > 200000) return fail(400, "Page is too far");
  return ok({ page, limit, skip });
}

function text(search: URLSearchParams) {
  return (search.get("q") || "").trim();
}

function contains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

function pick<T extends string>(value: string | null, allowed: readonly T[], label: string) {
  const raw = (value || "").trim();
  if (!raw) return ok<T | undefined>(undefined);
  if (!allowed.includes(raw as T)) return fail(400, `Unknown ${label}`);
  return ok(raw as T);
}

function dir(search: URLSearchParams): Prisma.SortOrder {
  return search.get("dir") === "asc" ? "asc" : "desc";
}

function customerWhere(search: URLSearchParams, role?: UserRole, tier?: SubscriptionTier): Prisma.UserWhereInput {
  const q = text(search);
  return {
    deletedAt: null,
    ...(role ? { role } : {}),
    ...(tier ? { subscriptionTier: tier } : {}),
    ...(search.get("status") ? { subscriptionStatus: search.get("status") as SubscriptionStatus } : {}),
    ...(q
      ? {
          OR: [{ email: contains(q) }, { name: contains(q) }, { phone: { contains: q } }]
        }
      : {})
  };
}

function customerOrder(search: URLSearchParams): Prisma.UserOrderByWithRelationInput {
  const sort = search.get("sort");
  const direction = dir(search);
  if (sort === "name") return { name: direction };
  if (sort === "email") return { email: direction };
  return { createdAt: direction };
}

export async function listAdminCustomers(search: URLSearchParams, mode: Mode = "page") {
  const page = readOffset(search, mode);
  if (!page.ok) return page;
  const role = pick(search.get("role"), ROLES, "role");
  if (!role.ok) return role;
  const tier = pick(search.get("tier"), TIERS, "tier");
  if (!tier.ok) return tier;
  const status = pick(search.get("status"), SUB_STATUS, "status");
  if (!status.ok) return status;
  const where = customerWhere(search, role.data, tier.data);
  if (status.data) where.subscriptionStatus = status.data;
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: customerOrder(search),
      skip: page.data.skip,
      take: page.data.limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        suspendedAt: true,
        createdAt: true,
        _count: { select: { businesses: true, payments: true } }
      }
    })
  ]);
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: maskPhone(row.phone),
      role: row.role,
      tier: row.subscriptionTier,
      status: row.subscriptionStatus,
      suspended: !!row.suspendedAt,
      businesses: row._count.businesses,
      payments: row._count.payments,
      createdAt: row.createdAt.toISOString()
    })),
    total,
    page: page.data.page,
    pageSize: page.data.limit,
    truncated: mode === "export" && total > rows.length
  });
}

function businessWhere(search: URLSearchParams): Prisma.BusinessWhereInput {
  const q = text(search);
  const archived = search.get("archived") === "1";
  const active = search.get("active");
  return {
    archived,
    ...(active === "1" ? { isActive: true } : active === "0" ? { isActive: false } : {}),
    ...(q
      ? {
          OR: [{ name: contains(q) }, { slug: contains(q) }, { city: contains(q) }]
        }
      : {})
  };
}

export async function listAdminBusinesses(search: URLSearchParams, mode: Mode = "page") {
  const page = readOffset(search, mode);
  if (!page.ok) return page;
  const where = businessWhere(search);
  const sort = search.get("sort") === "name" ? { name: dir(search) } : { createdAt: dir(search) };
  const [total, rows] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      orderBy: sort,
      skip: page.data.skip,
      take: page.data.limit,
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        phone: true,
        isActive: true,
        archived: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { reviews: true, qrCodes: true } }
      }
    })
  ]);
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city,
      phone: maskPhone(row.phone),
      isActive: row.isActive,
      archived: row.archived,
      ownerId: row.owner.id,
      ownerName: row.owner.name,
      ownerEmail: row.owner.email,
      reviews: row._count.reviews,
      qrs: row._count.qrCodes,
      createdAt: row.createdAt.toISOString()
    })),
    total,
    page: page.data.page,
    pageSize: page.data.limit,
    truncated: mode === "export" && total > rows.length
  });
}

export async function listAdminSubscriptions(search: URLSearchParams, mode: Mode = "page") {
  const page = readOffset(search, mode);
  if (!page.ok) return page;
  const status = pick(search.get("status"), SUB_STATUS, "status");
  if (!status.ok) return status;
  const q = text(search);
  const expiring = search.get("view") === "expiring";
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const where: Prisma.SubscriptionWhereInput = {
    ...(status.data ? { status: status.data } : {}),
    ...(expiring ? { status: "ACTIVE", endsAt: { lte: soon, gte: new Date() } } : {}),
    ...(q
      ? {
          user: {
            OR: [{ email: contains(q) }, { name: contains(q) }]
          }
        }
      : {})
  };
  const sort = search.get("sort") === "endsAt" ? { endsAt: dir(search) } : { createdAt: dir(search) };
  const [total, rows] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      orderBy: sort,
      skip: page.data.skip,
      take: page.data.limit,
      select: {
        id: true,
        status: true,
        endsAt: true,
        pricePaise: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        plan: { select: { nameEn: true } }
      }
    })
  ]);
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      userId: row.user.id,
      name: row.user.name,
      email: row.user.email,
      phone: maskPhone(row.user.phone),
      plan: row.plan?.nameEn || null,
      status: row.status,
      endsAt: row.endsAt?.toISOString() || null,
      pricePaise: row.pricePaise,
      createdAt: row.createdAt.toISOString()
    })),
    total,
    page: page.data.page,
    pageSize: page.data.limit,
    truncated: mode === "export" && total > rows.length
  });
}

export async function listAdminReferrals(search: URLSearchParams, mode: Mode = "page") {
  const page = readOffset(search, mode);
  if (!page.ok) return page;
  const status = pick(search.get("status"), REWARD_STATUS, "status");
  if (!status.ok) return status;
  const q = text(search);
  const where: Prisma.ReferralRewardWhereInput = {
    ...(status.data ? { status: status.data as ReferralRewardStatus } : {}),
    ...(q
      ? {
          OR: [
            { referrer: { email: contains(q) } },
            { referrer: { name: contains(q) } },
            { referred: { email: contains(q) } },
            { referred: { name: contains(q) } }
          ]
        }
      : {})
  };
  const sort = search.get("sort") === "holdUntil" ? { holdUntil: dir(search) } : { createdAt: dir(search) };
  const [total, rows] = await Promise.all([
    prisma.referralReward.count({ where }),
    prisma.referralReward.findMany({
      where,
      orderBy: sort,
      skip: page.data.skip,
      take: page.data.limit,
      select: {
        id: true,
        months: true,
        bonusDays: true,
        status: true,
        holdUntil: true,
        appliedAt: true,
        createdAt: true,
        referrer: { select: { id: true, name: true, email: true, phone: true } },
        referred: { select: { id: true, name: true, email: true, phone: true } }
      }
    })
  ]);
  return ok({
    items: rows.map((row) => ({
      id: row.id,
      referrerId: row.referrer.id,
      referrerName: row.referrer.name,
      referrerEmail: row.referrer.email,
      referrerPhone: maskPhone(row.referrer.phone),
      referredId: row.referred.id,
      referredName: row.referred.name,
      referredEmail: row.referred.email,
      referredPhone: maskPhone(row.referred.phone),
      months: row.months,
      bonusDays: row.bonusDays,
      status: row.status,
      holdUntil: row.holdUntil.toISOString(),
      appliedAt: row.appliedAt?.toISOString() || null,
      createdAt: row.createdAt.toISOString()
    })),
    total,
    page: page.data.page,
    pageSize: page.data.limit,
    truncated: mode === "export" && total > rows.length
  });
}
