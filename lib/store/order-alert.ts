import { prisma } from "../db";
import { sendPushToUsers } from "../push";
import { STATUS_LABEL, type OrderStatus } from "./order-status";
import { formatRupees } from "../tap/order-message";

import { dispatchJob } from "../jobs/dispatch";

/** In-app alert for the owner and every staff member. The caller ignores failures so the customer's order still succeeds. */
export async function notifyNewOrder(input: {
  businessId: string;
  ownerId: string;
  number: string;
  businessName: string;
  totalPaise: number;
  orderId: string;
}) {
  await dispatchJob("notify.order", input, `notify.order:${input.orderId}`);
}

export async function deliverNewOrder(input: {
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

/** Same push path as a new order, with a booking payload the app can route and chime. */
export async function notifyNewBooking(input: {
  businessId: string;
  ownerId: string;
  businessName: string;
  serviceName: string;
  customerName: string;
  bookingId: string;
}) {
  await dispatchJob("notify.booking", input, `notify.booking:${input.bookingId}`);
}

export async function deliverNewBooking(input: {
  businessId: string;
  ownerId: string;
  businessName: string;
  serviceName: string;
  customerName: string;
  bookingId: string;
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
      type: "booking_request",
      title: `New booking`,
      message: `${input.businessName} · ${input.serviceName} · ${input.customerName}`,
      link: "/dashboard/sell/bookings",
      metadata: { bookingId: input.bookingId, businessId: input.businessId }
    }))
  });
  await sendPushToUsers(userIds, {
    title: "New booking",
    body: `${input.businessName} · ${input.serviceName}`,
    data: { type: "booking_request", bookingId: input.bookingId, businessId: input.businessId, sound: "order" }
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
  await dispatchJob("notify.orderStatus", input, `notify.orderStatus:${input.orderId}:${input.status}`);
}

export async function deliverOrderStatus(input: {
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
