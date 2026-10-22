import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { effectiveTier } from "@/lib/payments";

export function tapAccess(owner: Parameters<typeof effectiveTier>[0]) {
  const paid = effectiveTier(owner) !== "FREE";
  return { paid, limited: owner.subscriptionTier !== "FREE" && !paid };
}
import type { TapBusinessFields } from "./links";
import { isReservedSlug } from "./reserved-slugs";

export type TapRecord =
  | { status: "not_found" }
  | { status: "unassigned"; qrId: string }
  | { status: "disabled"; qrId: string }
  | {
      status: "limited";
      qrId: string;
      shortCode: string;
      ownerId: string;
      businessId: string;
      paid: boolean;
      business: TapBusinessFields;
      locationSlug: string;
      staffSlug: string;
    }
  | {
      status: "active";
      qrId: string;
      shortCode: string;
      ownerId: string;
      businessId: string;
      paid: boolean;
      business: TapBusinessFields;
      locationSlug: string;
      staffSlug: string;
    };

async function queryTap(code: string): Promise<TapRecord> {
  const qr = await prisma.qRCode.findUnique({
    where: { shortCode: code },
    include: {
      business: {
        include: {
          owner: {
            select: {
              id: true,
              subscriptionTier: true,
              subscriptionStatus: true,
              trialEndsAt: true,
              subscriptionEndsAt: true
            }
          }
        }
      },
      location: { select: { slug: true } },
      staff: { select: { slug: true } }
    }
  });
  if (!qr) return { status: "not_found" };
  if (qr.status === "DISABLED" || !qr.isActive) return { status: "disabled", qrId: qr.id };
  if (!qr.business || qr.status === "UNASSIGNED") return { status: "unassigned", qrId: qr.id };
  if (!qr.business.isActive || qr.business.archived) return { status: "disabled", qrId: qr.id };

  const [menuCount, tapPage] = await Promise.all([
    prisma.menuItem.count({ where: { businessId: qr.business.id } }),
    prisma.tapPage.findUnique({ where: { businessId: qr.business.id }, select: { published: true } })
  ]);
  const business: TapBusinessFields = {
    name: qr.business.name,
    slug: qr.business.slug,
    description: qr.business.description || "",
    logo: qr.business.logo,
    cover: qr.business.coverImage,
    phone: qr.business.phone,
    address: qr.business.address,
    city: qr.business.city,
    state: qr.business.state,
    pincode: qr.business.pincode,
    googleReviewUrl: qr.business.googleReviewUrl,
    trustpilotUrl: qr.business.trustpilotUrl,
    reviewPlatform: qr.business.reviewPlatform,
    reviewGating: qr.business.reviewGating,
    ratingThreshold: qr.business.ratingThreshold,
    aiReviewsEnabled: qr.business.aiReviewsEnabled,
    whatsappNumber: qr.business.whatsappNumber,
    menuCount,
    published: tapPage?.published ?? null
  };
  const owner = qr.business.owner;
  const access = tapAccess(owner);
  const shared = {
    qrId: qr.id,
    shortCode: qr.shortCode,
    ownerId: owner.id,
    businessId: qr.business.id,
    paid: access.paid,
    business,
    locationSlug: qr.location?.slug || "",
    staffSlug: qr.staff?.slug || ""
  };
  return access.limited ? { status: "limited", ...shared } : { status: "active", ...shared };
}

/** Cached business snapshot. Tags: tap:<code> and biz:<businessId>. */
export async function loadPublicTap(code: string): Promise<TapRecord> {
  const pointer = await prisma.qRCode.findUnique({
    where: { shortCode: code },
    select: { businessId: true }
  });
  const tags = [`tap:${code}`];
  if (pointer?.businessId) tags.push(`biz:${pointer.businessId}`);
  return unstable_cache(() => queryTap(code), ["tap-public", code, pointer?.businessId || ""], {
    revalidate: 60,
    tags
  })();
}

/** Pretty URL. Uses the oldest active QR when the business has one. */
export async function loadPublicSlug(slug: string): Promise<TapRecord> {
  const clean = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean) || isReservedSlug(clean)) {
    return { status: "not_found" };
  }
  const business = await prisma.business.findFirst({
    where: { slug: clean, archived: false, isActive: true },
    select: { id: true }
  });
  if (!business) return { status: "not_found" };
  const qr = await prisma.qRCode.findFirst({
    where: { businessId: business.id, status: "ACTIVE", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { shortCode: true }
  });
  if (qr) return loadPublicTap(qr.shortCode);
  return queryBusinessPage(business.id);
}

async function queryBusinessPage(businessId: string): Promise<TapRecord> {
  const business = await prisma.business.findFirst({
    where: { id: businessId, archived: false, isActive: true },
    include: {
      owner: {
        select: {
          id: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          subscriptionEndsAt: true
        }
      }
    }
  });
  if (!business) return { status: "not_found" };
  const [menuCount, tapPage] = await Promise.all([
    prisma.menuItem.count({ where: { businessId: business.id } }),
    prisma.tapPage.findUnique({ where: { businessId: business.id }, select: { published: true } })
  ]);
  const fields: TapBusinessFields = {
    name: business.name,
    slug: business.slug,
    description: business.description || "",
    logo: business.logo,
    cover: business.coverImage,
    phone: business.phone,
    address: business.address,
    city: business.city,
    state: business.state,
    pincode: business.pincode,
    googleReviewUrl: business.googleReviewUrl,
    trustpilotUrl: business.trustpilotUrl,
    reviewPlatform: business.reviewPlatform,
    reviewGating: business.reviewGating,
    ratingThreshold: business.ratingThreshold,
    aiReviewsEnabled: business.aiReviewsEnabled,
    whatsappNumber: business.whatsappNumber,
    menuCount,
    published: tapPage?.published ?? null
  };
  const access = tapAccess(business.owner);
  const shared = {
    qrId: "",
    shortCode: "",
    ownerId: business.owner.id,
    businessId: business.id,
    paid: access.paid,
    business: fields,
    locationSlug: "",
    staffSlug: ""
  };
  return access.limited ? { status: "limited", ...shared } : { status: "active", ...shared };
}
