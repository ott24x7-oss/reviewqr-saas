import { prisma } from "@/lib/db";
import { loadEntitlement } from "@/lib/plans/entitlements";
import { recordQrScan } from "@/lib/scans";
import { linksForDirect, resolveDirect } from "./direct";
import type { TapBusinessFields } from "./links";
import { isLookupCode } from "./ids";
import { tapAccess } from "./resolve";
import { scanSource } from "./source";

export type DirectScanResult =
  | { action: "page" }
  | { action: "redirect"; location: string; targetType: string };

/** Decides the scan, and writes the scan row before a redirect is returned. */
export async function decideDirectScan(input: {
  code: string;
  channel: "q" | "t";
  page: string | null;
  src?: string | null;
  ownHosts: string[];
  headers: Headers;
}): Promise<DirectScanResult> {
  if (input.page === "1" || !isLookupCode(input.code)) return { action: "page" };
  const qr = await prisma.qRCode.findUnique({
    where: { shortCode: input.code },
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
      }
    }
  });
  if (!qr?.business || !qr.isActive || qr.status !== "ACTIVE") return { action: "page" };
  if (!qr.business.isActive || qr.business.archived) return { action: "page" };
  const access = tapAccess(qr.business.owner);
  const [menuCount, serviceCount, tapPage, entitlement] = await Promise.all([
    prisma.menuItem.count({ where: { businessId: qr.business.id } }),
    prisma.menuItem.count({ where: { businessId: qr.business.id, kind: "SERVICE" } }),
    prisma.tapPage.findUnique({ where: { businessId: qr.business.id }, select: { published: true } }),
    loadEntitlement(qr.business.owner.id)
  ]);
  const fields: TapBusinessFields = {
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
    catalogMode: qr.business.catalogMode,
    serviceCount,
    published: tapPage?.published ?? null
  };
  const decision = resolveDirect({
    pagePreview: false,
    limited: access.limited,
    deviceMode: qr.directMode,
    deviceTarget: qr.directTarget,
    businessMode: qr.business.directMode,
    businessTarget: qr.business.directTarget,
    links: linksForDirect(fields, input.channel, qr.shortCode),
    modules: entitlement.modules,
    ownHosts: input.ownHosts
  });
  if (decision.action !== "redirect") return { action: "page" };
  await recordQrScan(qr.id, input.headers, scanSource(input.channel, input.src), {
    direct: true,
    target: decision.targetType
  });
  return { action: "redirect", location: decision.href, targetType: decision.targetType };
}
