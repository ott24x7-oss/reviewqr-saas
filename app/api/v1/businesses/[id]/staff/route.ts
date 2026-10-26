import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data, v1Error, v1From } from "@/lib/api/v1";
import { featureBlock } from "@/lib/plans/feature-gate";
import { prisma } from "@/lib/db";
import { ownerLimitError } from "@/lib/entitlements";
import { staffSchema } from "@/lib/validations";
import { locationInBusiness, planOwner, requireBusinessRole } from "@/lib/tenant";
import { nanoSlug, slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const business = await requireBusinessRole(auth.user.id, params.id, "read");
  if (!business) return v1Error(404, "NOT_FOUND", "Not found");
  const blocked = await featureBlock(business.ownerId, "staff");
  if (blocked) return v1From(blocked);
  const items = await prisma.staff.findMany({
    where: { businessId: business.id, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true, phone: true }
  });
  return v1Data({ items });
}

async function postHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const business = await requireBusinessRole(auth.user.id, params.id, "manage");
  if (!business) return v1Error(404, "NOT_FOUND", "Not found");
  const owner = await planOwner(
    {
      id: auth.user.id,
      subscriptionTier: "FREE",
      subscriptionStatus: "ACTIVE",
      trialEndsAt: null,
      subscriptionEndsAt: null
    },
    business.ownerId
  );
  if (!owner) return v1Error(404, "NOT_FOUND", "Not found");
  const blocked = await featureBlock(business.ownerId, "staff");
  if (blocked) return v1From(blocked);
  const count = await prisma.staff.count({ where: { business: { ownerId: business.ownerId }, isActive: true } });
  const limitError = await ownerLimitError(owner, "staff", count);
  if (limitError) return v1Error(402, "LIMIT", limitError);
  const parsed = staffSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return v1Error(400, "VALIDATION", parsed.error.issues[0]?.message || "Invalid input");
  const location = await locationInBusiness(business.id, parsed.data.locationId);
  if (!location.ok) return v1Error(400, "VALIDATION", location.error);
  let slug = slugify(parsed.data.name);
  while (await prisma.staff.findUnique({ where: { businessId_slug: { businessId: business.id, slug } } })) {
    slug = slugify(parsed.data.name) + "-" + nanoSlug().slice(0, 4);
  }
  const staff = await prisma.staff.create({
    data: {
      businessId: business.id,
      name: parsed.data.name,
      slug,
      role: parsed.data.role || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      locationId: parsed.data.locationId || null
    },
    select: { id: true, name: true, role: true }
  });
  return v1Data({ staff }, 201);
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);
