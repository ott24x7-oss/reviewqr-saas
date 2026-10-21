import { prisma } from "../db";
import { accessRole, allows, readableBusinessWhere } from "../tenant";
import { toOrderCard, type OrderCard } from "./order-status";

/** Latest orders this user can read. Pass an id to load one card after a status change. */
export async function loadOrderCards(userId: string, orderId?: string): Promise<OrderCard[]> {
  const orders = await prisma.menuOrder.findMany({
    where: {
      business: readableBusinessWhere(userId),
      ...(orderId ? { id: orderId } : {})
    },
    orderBy: { createdAt: "desc" },
    take: orderId ? 1 : 50,
    include: {
      business: {
        select: {
          name: true,
          ownerId: true,
          members: { where: { userId }, select: { role: true }, take: 1 }
        }
      }
    }
  });
  return orders.map((order) => {
    const role = accessRole(order.business.ownerId, userId, order.business.members[0]?.role);
    return toOrderCard(
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
  });
}
