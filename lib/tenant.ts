import type { BusinessMemberRole } from "@prisma/client";
import { prisma } from "./db";
import type { LimitUser } from "./entitlements";

export type AccessRole = "OWNER" | "AGENT" | BusinessMemberRole;

/** True when a location or staff row belongs to the business in the URL. */
export function belongsToBusiness(recordBusinessId: string | null | undefined, businessId: string) {
  return !!recordBusinessId && recordBusinessId === businessId;
}

export function accessRole(
  ownerId: string,
  userId: string,
  memberRole?: BusinessMemberRole | null,
  agentId?: string | null
): AccessRole | null {
  if (ownerId === userId) return "OWNER";
  if (agentId && agentId === userId) return "AGENT";
  if (memberRole === "MANAGER" || memberRole === "STAFF") return memberRole;
  return null;
}

export function allows(role: AccessRole | null, level: "read" | "manage") {
  if (!role) return false;
  if (level === "read") return true;
  return role === "OWNER" || role === "MANAGER" || role === "AGENT";
}

/** Businesses this user may see in the dashboard switcher and feedback list. */
export function readableBusinessWhere(userId: string) {
  return {
    archived: false as const,
    OR: [{ ownerId: userId }, { agentId: userId }, { members: { some: { userId } } }]
  };
}

/** Businesses this user may manage: owner, field agent or MANAGER member. STAFF stay out. */
export function manageableBusinessWhere(userId: string) {
  return {
    archived: false as const,
    OR: [{ ownerId: userId }, { agentId: userId }, { members: { some: { userId, role: "MANAGER" as const } } }]
  };
}

/** Businesses this person owns or was assigned as a field agent. Memberships stay out. */
export function ownedOrAssignedWhere(userId: string) {
  return {
    archived: false as const,
    OR: [{ ownerId: userId }, { agentId: userId }]
  };
}

export function agentIdFor(user: { id: string; role: string }) {
  return user.role === "AGENT" ? user.id : null;
}

export async function loadOwnedBusiness(userId: string, businessId: string) {
  return prisma.business.findFirst({
    where: { id: businessId, ownerId: userId }
  });
}

/** Owner, or a member when the level allows that membership role. */
export async function requireBusinessRole(userId: string, businessId: string, level: "read" | "manage") {
  const business = await prisma.business.findFirst({
    where: { id: businessId, archived: false },
    include: { members: { where: { userId }, select: { role: true }, take: 1 } }
  });
  if (!business) return null;
  const role = accessRole(business.ownerId, userId, business.members[0]?.role, business.agentId);
  if (!allows(role, level)) return null;
  return { ...business, accessRole: role! };
}

export async function planOwner(actor: LimitUser, ownerId: string): Promise<LimitUser | null> {
  if (actor.id === ownerId) return actor;
  return prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      id: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true
    }
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
