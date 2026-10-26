import { featureBlock } from "../plans/feature-gate";
import { requireBusinessRole } from "../tenant";

/** Menu AI may run only when the owner has the Menu module. */
export async function menuAiAccess(userId: string, businessId: string) {
  const business = await requireBusinessRole(userId, businessId, "manage");
  if (!business) return null;
  const locked = await featureBlock(business.ownerId, "menu");
  if (locked) return { blocked: locked } as const;
  return { business } as const;
}
