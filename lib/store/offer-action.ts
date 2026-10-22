import { offerActionSchema } from "@reviewqr/shared";
import { prisma } from "../db";
import { cursorQuery, type PageQuery } from "../api/cursor";
import { takePage } from "../api/page";
import { fail, ok, type Fail } from "../api/result";
import { endOfKolkataDay, normalizeCouponCode } from "./coupons";
import { revalidateBusinessTap } from "../tap/theme-store";
import { moduleBlock } from "../plans/entitlements";
import { requireBusinessRole } from "../tenant";

type OfferBody = ReturnType<typeof offerActionSchema.parse>;

async function storeLocked(ownerId: string) {
  const locked = await moduleBlock(ownerId, "STORE");
  return locked ? fail(403, locked) : null;
}

export async function listCoupons(userId: string, businessId: string, page: PageQuery) {
  const business = await requireBusinessRole(userId, businessId, "read");
  if (!business) return fail(404, "Not found");
  const locked = await storeLocked(business.ownerId);
  if (locked) return locked;
  return takePage(
    () =>
      prisma.coupon.findMany({
        where: { businessId: business.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...cursorQuery(page.cursorId, page.limit)
      }),
    page.limit
  );
}

export async function listOfferBanners(userId: string, businessId: string, page: PageQuery) {
  const business = await requireBusinessRole(userId, businessId, "read");
  if (!business) return fail(404, "Not found");
  const locked = await storeLocked(business.ownerId);
  if (locked) return locked;
  return takePage(
    () =>
      prisma.offerBanner.findMany({
        where: { businessId: business.id },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        ...cursorQuery(page.cursorId, page.limit)
      }),
    page.limit
  );
}

export async function applyOfferAction(userId: string, businessId: string, raw: unknown) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return fail(404, "Not found");
  const locked = await storeLocked(business.ownerId);
  if (locked) return locked;
  const parsed = offerActionSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message || "Invalid input");
  }
  const failed = await applyOffer(business.id, parsed.data);
  if (failed) return failed;
  await revalidateBusinessTap(business.id);
  return ok({ ok: true as const });
}

async function applyOffer(businessId: string, data: OfferBody): Promise<Fail | null> {
  if (data.action === "coupon") return createCoupon(businessId, data);
  if (data.action === "coupon-update" && data.id) return updateCoupon(businessId, data);
  if (data.action === "coupon-delete" && data.id) {
    await prisma.coupon.deleteMany({ where: { id: data.id, businessId } });
    return null;
  }
  if (data.action === "banner") return createBanner(businessId, data);
  if (data.action === "banner-update" && data.id) return updateBanner(businessId, data);
  if (data.action === "banner-delete" && data.id) {
    await prisma.offerBanner.deleteMany({ where: { id: data.id, businessId } });
    return null;
  }
  return fail(400, "Unknown action");
}

function amountPaise(kind: "PERCENT" | "FLAT", amount: number) {
  if (kind === "PERCENT") {
    const percent = Math.round(amount);
    if (percent < 1 || percent > 100) return null;
    return percent;
  }
  const paise = Math.round(amount * 100);
  if (paise <= 0) return null;
  return paise;
}

async function createCoupon(businessId: string, data: OfferBody): Promise<Fail | null> {
  const code = normalizeCouponCode(data.code || "");
  if (code.length < 3) return fail(400, "Use at least 3 letters or numbers");
  if (!data.kind || data.amount === undefined) return fail(400, "Set the discount");
  const amount = amountPaise(data.kind, data.amount);
  if (amount == null) return fail(400, "Set the discount");
  const expiresAt = data.expiresOn ? endOfKolkataDay(data.expiresOn) : null;
  if (data.expiresOn && !expiresAt) return fail(400, "Enter a valid expiry date");
  try {
    await prisma.coupon.create({
      data: {
        businessId,
        code,
        kind: data.kind,
        amount,
        minSubtotalPaise: Math.round((data.minRupees || 0) * 100),
        expiresAt,
        usageLimit: data.usageLimit ?? null,
        active: data.active !== false
      }
    });
  } catch (err) {
    if (isUnique(err)) return fail(400, "That code already exists");
    throw err;
  }
  return null;
}

async function updateCoupon(businessId: string, data: OfferBody): Promise<Fail | null> {
  const row = await prisma.coupon.findFirst({ where: { id: data.id, businessId } });
  if (!row) return fail(400, "Coupon not found");
  const kind = data.kind || row.kind;
  const amount = data.amount === undefined ? row.amount : amountPaise(kind, data.amount);
  if (amount == null) return fail(400, "Set the discount");
  const expiresAt = data.expiresOn === undefined ? row.expiresAt : data.expiresOn ? endOfKolkataDay(data.expiresOn) : null;
  if (data.expiresOn && !expiresAt) return fail(400, "Enter a valid expiry date");
  await prisma.coupon.update({
    where: { id: row.id },
    data: {
      kind,
      amount,
      ...(data.minRupees !== undefined ? { minSubtotalPaise: Math.round(data.minRupees * 100) } : {}),
      ...(data.expiresOn !== undefined ? { expiresAt } : {}),
      ...(data.usageLimit !== undefined ? { usageLimit: data.usageLimit } : {}),
      ...(data.active !== undefined ? { active: data.active } : {})
    }
  });
  return null;
}

async function createBanner(businessId: string, data: OfferBody): Promise<Fail | null> {
  const title = (data.title || "").trim();
  if (!title) return fail(400, "Name the offer");
  const expiresAt = data.expiresOn ? endOfKolkataDay(data.expiresOn) : null;
  if (data.expiresOn && !expiresAt) return fail(400, "Enter a valid expiry date");
  const sortOrder = await prisma.offerBanner.count({ where: { businessId } });
  await prisma.offerBanner.create({
    data: {
      businessId,
      title,
      body: (data.body || "").trim(),
      active: data.active !== false,
      expiresAt,
      sortOrder
    }
  });
  return null;
}

async function updateBanner(businessId: string, data: OfferBody): Promise<Fail | null> {
  const row = await prisma.offerBanner.findFirst({ where: { id: data.id, businessId } });
  if (!row) return fail(400, "Offer not found");
  const title = data.title !== undefined ? data.title.trim() : row.title;
  if (!title) return fail(400, "Name the offer");
  const expiresAt = data.expiresOn === undefined ? row.expiresAt : data.expiresOn ? endOfKolkataDay(data.expiresOn) : null;
  if (data.expiresOn && !expiresAt) return fail(400, "Enter a valid expiry date");
  await prisma.offerBanner.update({
    where: { id: row.id },
    data: {
      title,
      ...(data.body !== undefined ? { body: data.body.trim() } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.expiresOn !== undefined ? { expiresAt } : {})
    }
  });
  return null;
}

function isUnique(err: unknown) {
  return !!err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002";
}
