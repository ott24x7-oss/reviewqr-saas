import { prisma } from "./db";

/** True when a location or staff row belongs to the business in the URL. */
export function belongsToBusiness(recordBusinessId: string | null | undefined, businessId: string) {
  return !!recordBusinessId && recordBusinessId === businessId;
}

export async function loadOwnedBusiness(userId: string, businessId: string) {
  return prisma.business.findFirst({
    where: { id: businessId, ownerId: userId }
  });
}

export async function locationInBusiness(businessId: string, locationId?: string | null) {
  if (!locationId) return { ok: true as const };
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, businessId: true }
  });
  if (!location || !belongsToBusiness(location.businessId, businessId)) {
    return { ok: false as const, error: "Location does not belong to this business" };
  }
  return { ok: true as const, location };
}

export async function staffInBusiness(businessId: string, staffId?: string | null) {
  if (!staffId) return { ok: true as const };
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, businessId: true }
  });
  if (!staff || !belongsToBusiness(staff.businessId, businessId)) {
    return { ok: false as const, error: "Staff member does not belong to this business" };
  }
  return { ok: true as const, staff };
}
