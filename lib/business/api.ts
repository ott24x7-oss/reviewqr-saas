import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { ownerLimitError } from "../entitlements";
import { omitUnchangedImages } from "../images";
import { cursorQuery, type PageQuery } from "../api/cursor";
import { takePage } from "../api/page";
import { fail, ok } from "../api/result";
import { attachTapDraft } from "../tap/new-business";
import { isReservedSlug } from "../tap/reserved-slugs";
import { agentIdFor, ownedOrAssignedWhere, requireBusinessRole } from "../tenant";
import { slugify } from "../utils";
import { businessSchema } from "../validations";

const limitSelect = {
  id: true,
  subscriptionTier: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  subscriptionEndsAt: true
} satisfies Prisma.UserSelect;

const businessInclude = {
  _count: { select: { reviews: true, feedbacks: true, locations: true, qrCodes: true } }
} satisfies Prisma.BusinessInclude;

export async function listOwnedBusinesses(userId: string) {
  const businesses = await prisma.business.findMany({
    where: ownedOrAssignedWhere(userId),
    include: businessInclude,
    orderBy: { createdAt: "desc" }
  });
  return ok({ businesses });
}

export async function listBusinessPage(userId: string, page: PageQuery) {
  return takePage(
    () =>
      prisma.business.findMany({
        where: ownedOrAssignedWhere(userId),
        include: businessInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...cursorQuery(page.cursorId, page.limit)
      }),
    page.limit
  );
}

export async function getBusiness(userId: string, businessId: string) {
  const business = await requireBusinessRole(userId, businessId, "read");
  if (!business) return fail(404, "Not found");
  return ok({ business });
}

export async function createBusiness(user: { id: string; role: string }, raw: unknown) {
  const actor = await prisma.user.findUnique({ where: { id: user.id }, select: limitSelect });
  if (!actor) return fail(401, "Unauthorized");
  const count = await prisma.business.count({ where: { ownerId: user.id, archived: false } });
  const limitError = await ownerLimitError(actor, "businesses", count);
  if (limitError) return fail(402, limitError);

  const parsed = businessSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(400, parsed.error.issues[0]?.message || "Invalid input");
  }
  const data = parsed.data;

  let slug = slugify(data.name);
  let n = 0;
  while (isReservedSlug(slug) || (await prisma.business.findUnique({ where: { slug } }))) {
    n += 1;
    slug = slugify(data.name) + "-" + (n + 1);
    if (n > 5) {
      slug = slugify(data.name, true);
      break;
    }
  }

  let linkedAgent = agentIdFor(user);
  if (!linkedAgent) {
    const attribution = await prisma.signupAttribution.findUnique({
      where: { userId: user.id },
      select: { agentId: true }
    });
    linkedAgent = attribution?.agentId || null;
  }

  const business = await prisma.business.create({
    data: {
      ownerId: user.id,
      agentId: linkedAgent,
      name: data.name,
      slug,
      industry: data.industry || null,
      description: data.description || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsappNumber: data.whatsappNumber || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      googleReviewUrl: data.googleReviewUrl || null,
      trustpilotUrl: data.trustpilotUrl || null,
      reviewPlatform: data.reviewPlatform || "google",
      ratingThreshold: data.ratingThreshold,
      reviewGating: data.reviewGating,
      primaryColor: data.primaryColor,
      logo: data.logo || null,
      coverImage: data.coverImage || null
    }
  });

  await attachTapDraft(business.id, data.industry, {
    phone: data.phone,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    googleReviewUrl: data.googleReviewUrl,
    whatsappNumber: data.whatsappNumber
  });

  return ok({ business });
}

export async function updateBusiness(userId: string, businessId: string, raw: unknown) {
  const existing = await requireBusinessRole(userId, businessId, "manage");
  if (!existing) return fail(404, "Not found");
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? omitUnchangedImages(
          raw as Record<string, unknown>,
          { logo: existing.logo, coverImage: existing.coverImage },
          ["logo", "coverImage"]
        )
      : {};
  const parsed = businessSchema.partial().safeParse(body);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || "Invalid input");
  const business = await prisma.business.update({
    where: { id: existing.id },
    data: parsed.data as Prisma.BusinessUpdateInput
  });
  return ok({ business });
}

export async function archiveBusiness(userId: string, businessId: string) {
  const existing = await requireBusinessRole(userId, businessId, "manage");
  if (!existing || existing.accessRole !== "OWNER") return fail(404, "Not found");
  await prisma.business.update({
    where: { id: existing.id },
    data: { archived: true, isActive: false }
  });
  return ok({ ok: true as const });
}
