import { prisma } from "../db";
import { sendPushToUsers } from "../push";
import { STATUS_LABEL, type OrderStatus } from "./order-status";
import { formatRupees } from "../tap/order-message";

/** In-app alert for the owner and every staff member. The caller ignores failures so the customer's order still succeeds. */
export async function notifyNewOrder(input: {
  businessId: string;
  ownerId: string;
  number: string;
  businessName: string;
  totalPaise: number;
  orderId: string;
}) {
  const members = await prisma.businessMember.findMany({
    where: { businessId: input.businessId },
    select: { userId: true }
  });
  const userIds = [...new Set([input.ownerId, ...members.map((member) => member.userId)])];
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: "store_order",
      title: `New order ${input.number}`,
      message: `${input.businessName} · ${formatRupees(input.totalPaise)}`,
      link: "/dashboard/orders",
      metadata: { orderId: input.orderId, businessId: input.businessId }
    }))
  });
  await sendPushToUsers(userIds, {
    title: `New order ${input.number}`,
    body: `${input.businessName} · ${formatRupees(input.totalPaise)}`,
    data: { type: "store_order", orderId: input.orderId, businessId: input.businessId }
  });
}

export async function notifyOrderStatus(input: {
  businessId: string;
  ownerId: string;
  number: string;
  businessName: string;
  status: OrderStatus;
  orderId: string;
}) {
  const members = await prisma.businessMember.findMany({
    where: { businessId: input.businessId },
    select: { userId: true }
  });
  const userIds = [...new Set([input.ownerId, ...members.map((member) => member.userId)])];
  await sendPushToUsers(userIds, {
    title: `Order ${input.number} is ${STATUS_LABEL[input.status]}`,
    body: input.businessName,
    data: { type: "order_status", orderId: input.orderId, status: input.status }
  });
}
