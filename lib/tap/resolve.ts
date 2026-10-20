import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { effectiveTier } from "@/lib/payments";
import type { TapBusinessFields } from "./links";

export type TapRecord =
  | { status: "not_found" }
  | { status: "unassigned"; qrId: string }
  | { status: "disabled"; qrId: string }
  | {
      status: "limited";
      qrId: string;
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
    whatsappNumber: qr.business.whatsappNumber,
    menuCount,
    published: tapPage?.published ?? null
  };
  const owner = qr.business.owner;
  const shared = {
    qrId: qr.id,
    ownerId: owner.id,
    businessId: qr.business.id,
    paid: effectiveTier(owner) !== "FREE",
    business,
    locationSlug: qr.location?.slug || "",
    staffSlug: qr.staff?.slug || ""
  };
  const limited = owner.subscriptionTier !== "FREE" && !shared.paid;
  return limited ? { status: "limited", ...shared } : { status: "active", ...shared };
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
