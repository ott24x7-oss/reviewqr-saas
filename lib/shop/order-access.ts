/** Who may answer a proof or read a shop order besides the admin board. */
import { requireBusinessAccess } from "@/lib/access";

export async function canManageShopOrder(userId: string, order: { userId: string; businessId: string | null }) {
  if (order.userId === userId) return true;
  if (!order.businessId) return false;
  const access = await requireBusinessAccess(userId, order.businessId, "manage");
  return Boolean(access);
}
