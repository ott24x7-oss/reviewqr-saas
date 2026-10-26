import { fail, ok } from "../api/result";
import { prisma } from "../db";
import { accessRole, allows, requireBusinessRole } from "../tenant";
import { readStoredLines } from "./order-public";
import { readStatusEvents, toOrderCard } from "./order-status";
import { kotText } from "./order-window";

export async function loadOrderDetail(userId: string, orderId: string) {
  const order = await prisma.menuOrder.findUnique({
    where: { id: orderId },
    include: {
      business: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          agentId: true,
          members: { where: { userId }, select: { role: true }, take: 1 }
        }
      }
    }
  });
  if (!order) return fail(404, "Not found");
  const access = await requireBusinessRole(userId, order.businessId, "read");
  if (!access) return fail(404, "Not found");
  const role = accessRole(order.business.ownerId, userId, order.business.members[0]?.role, order.business.agentId);
  const card = toOrderCard(
    {
      id: order.id,
      number: order.number,
      businessName: order.business.name,
      status: order.status,
      createdAt: order.createdAt,
      customerName: order.customerName,
      place: order.tableOrAddress,
      note: order.note,
      orderType: order.orderType,
      pincode: order.pincode,
      payment: order.payment,
      totalPaise: order.totalPaise,
      items: order.items,
      customerPhone: order.customerPhone,
      consentAt: order.consentAt,
      lang: order.lang
    },
    allows(role, "manage")
  );
  const stored = readStoredLines(order.items);
  const variantIds = stored.map((line) => line.variantId).filter(Boolean);
  const addonIds = stored.flatMap((line) => line.addonIds);
  const [variants, addons] = await Promise.all([
    variantIds.length
      ? prisma.menuVariant.findMany({ where: { id: { in: variantIds }, businessId: order.businessId }, select: { id: true, label: true } })
      : Promise.resolve([]),
    addonIds.length
      ? prisma.menuAddOn.findMany({ where: { id: { in: addonIds }, businessId: order.businessId }, select: { id: true, name: true } })
      : Promise.resolve([])
  ]);
  const variantName = new Map(variants.map((row) => [row.id, row.label]));
  const addonName = new Map(addons.map((row) => [row.id, row.name]));
  const items = stored.map((line) => ({
    name: line.name,
    qty: line.qty,
    note: line.note,
    variant: variantName.get(line.variantId) || "",
    addons: line.addonIds.map((id) => addonName.get(id) || "").filter(Boolean)
  }));
  const events = readStatusEvents(order.events);
  const timeline = events.length ? events : [{ status: card.status, at: card.createdAt }];
  return ok({
    ...card,
    items,
    events: timeline,
    kot: kotText({ number: card.number, place: card.place, note: card.note, items })
  });
}
