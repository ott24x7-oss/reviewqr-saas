import type { Prisma } from "@prisma/client";
import { orderStatusSchema } from "@reviewqr/shared";
import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { requireBusinessRole } from "../tenant";
import { notifyOrderStatus } from "./order-alert";
import { loadOrderCards } from "./order-feed";
import { canSetStatus, nextStatusEvents } from "./order-status";

export async function setOrderStatus(userId: string, orderId: string, raw: unknown) {
  const parsed = orderStatusSchema.safeParse(raw);
  if (!parsed.success) return fail(400, "Choose a status.");

  const order = await prisma.menuOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      businessId: true,
      number: true,
      status: true,
      events: true,
      createdAt: true,
      business: { select: { name: true, ownerId: true } }
    }
  });
  if (!order) return fail(404, "Not found");

  const manage = await requireBusinessRole(userId, order.businessId, "manage");
  if (!manage) {
    const read = await requireBusinessRole(userId, order.businessId, "read");
    if (read) return fail(403, "You can view orders but not change them.");
    return fail(404, "Not found");
  }

  const next = parsed.data.status;
  if (order.status !== next) {
    if (!canSetStatus(order.status, next)) {
      return fail(400, "You can reject an order only while it is new or accepted.");
    }
    await prisma.menuOrder.update({
      where: { id: order.id },
      data: {
        status: next,
        events: nextStatusEvents(order.events, order.status, next, order.createdAt) as Prisma.InputJsonValue
      }
    });
    await notifyOrderStatus({
      businessId: order.businessId,
      ownerId: order.business.ownerId,
      number: order.number,
      businessName: order.business.name,
      status: next,
      orderId: order.id
    });
  }

  const card = (await loadOrderCards(userId, order.id))[0];
  if (!card) return fail(404, "Not found");
  return ok({ order: card });
}
