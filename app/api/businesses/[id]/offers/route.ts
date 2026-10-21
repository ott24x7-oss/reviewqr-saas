import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { revalidateBusinessTap } from "@/lib/tap/theme-store";
import { endOfKolkataDay, normalizeCouponCode } from "@/lib/store/coupons";

const schema = z.object({
  action: z.enum(["coupon", "coupon-update", "coupon-delete", "banner", "banner-update", "banner-delete"]),
  id: z.string().optional(),
  code: z.string().max(24).optional(),
  kind: z.enum(["PERCENT", "FLAT"]).optional(),
  amount: z.number().min(0).max(100000).optional(),
  minRupees: z.number().min(0).max(100000).optional(),
  expiresOn: z.string().max(10).nullable().optional(),
  usageLimit: z.number().int().min(1).max(100000).nullable().optional(),
  active: z.boolean().optional(),
  title: z.string().max(80).optional(),
  body: z.string().max(160).optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  const failed = await applyOffer(business.id, data);
  if (failed) return failed;
  await revalidateBusinessTap(business.id);
  return NextResponse.json({ ok: true });
}

async function applyOffer(businessId: string, data: z.infer<typeof schema>) {
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
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
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

async function createCoupon(businessId: string, data: z.infer<typeof schema>) {
  const code = normalizeCouponCode(data.code || "");
  if (code.length < 3) return NextResponse.json({ error: "Use at least 3 letters or numbers" }, { status: 400 });
  if (!data.kind || data.amount === undefined) return NextResponse.json({ error: "Set the discount" }, { status: 400 });
  const amount = amountPaise(data.kind, data.amount);
  if (amount == null) return NextResponse.json({ error: "Set the discount" }, { status: 400 });
  const expiresAt = data.expiresOn ? endOfKolkataDay(data.expiresOn) : null;
  if (data.expiresOn && !expiresAt) return NextResponse.json({ error: "Enter a valid expiry date" }, { status: 400 });
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
    if (isUnique(err)) return NextResponse.json({ error: "That code already exists" }, { status: 400 });
    throw err;
  }
  return null;
}

async function updateCoupon(businessId: string, data: z.infer<typeof schema>) {
  const row = await prisma.coupon.findFirst({ where: { id: data.id, businessId } });
  if (!row) return NextResponse.json({ error: "Coupon not found" }, { status: 400 });
  const kind = data.kind || row.kind;
  const amount = data.amount === undefined ? row.amount : amountPaise(kind, data.amount);
  if (amount == null) return NextResponse.json({ error: "Set the discount" }, { status: 400 });
  const expiresAt = data.expiresOn === undefined ? row.expiresAt : data.expiresOn ? endOfKolkataDay(data.expiresOn) : null;
  if (data.expiresOn && !expiresAt) return NextResponse.json({ error: "Enter a valid expiry date" }, { status: 400 });
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

async function createBanner(businessId: string, data: z.infer<typeof schema>) {
  const title = (data.title || "").trim();
  if (!title) return NextResponse.json({ error: "Name the offer" }, { status: 400 });
  const expiresAt = data.expiresOn ? endOfKolkataDay(data.expiresOn) : null;
  if (data.expiresOn && !expiresAt) return NextResponse.json({ error: "Enter a valid expiry date" }, { status: 400 });
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

async function updateBanner(businessId: string, data: z.infer<typeof schema>) {
  const row = await prisma.offerBanner.findFirst({ where: { id: data.id, businessId } });
  if (!row) return NextResponse.json({ error: "Offer not found" }, { status: 400 });
  const title = data.title !== undefined ? data.title.trim() : row.title;
  if (!title) return NextResponse.json({ error: "Name the offer" }, { status: 400 });
  const expiresAt = data.expiresOn === undefined ? row.expiresAt : data.expiresOn ? endOfKolkataDay(data.expiresOn) : null;
  if (data.expiresOn && !expiresAt) return NextResponse.json({ error: "Enter a valid expiry date" }, { status: 400 });
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
