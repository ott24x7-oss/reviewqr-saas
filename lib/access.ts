import type { UserRole } from "@prisma/client";
import { canAccessAdmin } from "./roles";
import { requireBusinessRole } from "./tenant";

export { canAccessAdmin };

/** Platform roles. Business data still goes through requireBusinessRole. */

export function canOnboard(role: UserRole) {
  return role === "ADMIN" || role === "AGENT" || role === "USER" || role === "AGENCY";
}

export async function requireBusinessAccess(userId: string, businessId: string, level: "read" | "manage") {
  return requireBusinessRole(userId, businessId, level);
}
