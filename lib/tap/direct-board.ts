import type { Business, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { loadEntitlement } from "@/lib/plans/entitlements";
import { describeOpen, linksForDirect, resolveDirect, type DirectChoiceLink } from "./direct";
import { ownHostsFrom } from "./direct-http";
import type { TapBusinessFields } from "./links";
import { tapAccess } from "./resolve";

type OwnerBits = Pick<User, "subscriptionTier" | "subscriptionStatus" | "trialEndsAt" | "subscriptionEndsAt">;

export type DirectOption = { key: string; labelEn: string; labelHi: string };

export type DirectContext = {
  options: DirectOption[];
  label: (deviceMode: string, deviceTarget: string) => { labelEn: string; labelHi: string };
};

function fieldsFor(row: Business, menuCount: number, published: unknown): TapBusinessFields {
  return {
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    logo: row.logo,
    cover: row.coverImage,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    googleReviewUrl: row.googleReviewUrl,
    trustpilotUrl: row.trustpilotUrl,
    reviewPlatform: row.reviewPlatform,
    reviewGating: row.reviewGating,
    ratingThreshold: row.ratingThreshold,
    aiReviewsEnabled: row.aiReviewsEnabled,
    whatsappNumber: row.whatsappNumber,
    menuCount,
    published
  };
}

export async function directBoard(rows: Array<Business & { owner: OwnerBits }>) {
  const out = new Map<string, DirectContext>();
  if (!rows.length) return out;
  const ids = rows.map((row) => row.id);
  const ownerIds = [...new Set(rows.map((row) => row.ownerId))];
  const [pages, counts, entitlements] = await Promise.all([
    prisma.tapPage.findMany({ where: { businessId: { in: ids } }, select: { businessId: true, published: true } }),
    prisma.menuItem.groupBy({
      by: ["businessId"],
      where: { businessId: { in: ids } },
      _count: { _all: true }
    }),
    Promise.all(ownerIds.map(async (id) => [id, await loadEntitlement(id)] as const))
  ]);
  const published = new Map(pages.map((page) => [page.businessId, page.published]));
  const menuCount = new Map(counts.map((row) => [row.businessId, row._count._all]));
  const modules = new Map(entitlements.map(([id, ent]) => [id, ent.modules]));
  const hosts = ownHostsFrom("", process.env.NEXT_PUBLIC_APP_URL);
  for (const row of rows) {
    const access = tapAccess(row.owner);
    const links = linksForDirect(fieldsFor(row, menuCount.get(row.id) || 0, published.get(row.id) ?? null), "q", "board");
    const allowed = links.filter((link) => openable(link, links, modules.get(row.ownerId) || [], hosts));
    out.set(row.id, {
      options: allowed.map((link) => ({ key: link.key, labelEn: link.labelEn, labelHi: link.labelHi })),
      label: (deviceMode, deviceTarget) =>
        describeOpen({
          limited: access.limited,
          deviceMode,
          deviceTarget,
          businessMode: row.directMode,
          businessTarget: row.directTarget,
          links,
          modules: modules.get(row.ownerId) || [],
          ownHosts: hosts
        })
    });
  }
  return out;
}

function openable(link: DirectChoiceLink, links: DirectChoiceLink[], modules: readonly string[], hosts: string[]) {
  return resolveDirect({
    pagePreview: false,
    limited: false,
    deviceMode: "DIRECT",
    deviceTarget: link.key,
    businessMode: "TAP_PAGE",
    businessTarget: "",
    links,
    modules,
    ownHosts: hosts
  }).action === "redirect";
}

export async function directContextForBusiness(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      owner: {
        select: {
          subscriptionTier: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          subscriptionEndsAt: true
        }
      }
    }
  });
  if (!business) return null;
  const board = await directBoard([business]);
  return board.get(businessId) || null;
}
