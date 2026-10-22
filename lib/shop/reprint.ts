/** Damage or misprint requests. Approval is the only way Delivered becomes Reprint. */
import { fail, ok } from "@/lib/api/result";
import { logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { canManageShopOrder } from "./order-access";
import { moveShopOrder } from "./order-move";

const REASONS = ["damage", "misprint"] as const;

export async function requestShopReprint(opts: {
  orderId: string;
  userId: string;
  reason: string;
  note?: string | null;
}) {
  if (!REASONS.includes(opts.reason as (typeof REASONS)[number])) {
    return fail(400, "Choose damage or misprint");
  }
  const order = await prisma.shopOrder.findUnique({
    where: { id: opts.orderId },
    select: { id: true, userId: true, businessId: true, status: true }
  });
  if (!order) return fail(404, "Order not found");
  if (!(await canManageShopOrder(opts.userId, order))) return fail(403, "You cannot update this order");
  if (order.status !== "DELIVERED") return fail(400, "A reprint can be requested after delivery");
  const pending = await prisma.shopReprintRequest.findFirst({
    where: { orderId: order.id, status: "PENDING" }
  });
  if (pending) return ok({ id: pending.id, status: "PENDING" as const });
  const created = await prisma.shopReprintRequest.create({
    data: {
      orderId: order.id,
      userId: opts.userId,
      reason: opts.reason,
      note: opts.note?.trim() || null,
      status: "PENDING"
    }
  });
  const label = opts.reason === "misprint" ? "Misprint" : "Damage";
  await logAudit({
    userId: opts.userId,
    action: "shop.reprint",
    entity: "ShopOrder",
    entityId: order.id,
    metadata: { comment: opts.note?.trim() ? `${label}: ${opts.note.trim()}` : label, status: "PENDING" }
  });
  return ok({ id: created.id, status: "PENDING" as const });
}

export async function decideShopReprint(opts: {
  orderId: string;
  userId: string;
  action: "approve" | "reject";
}) {
  const pending = await prisma.shopReprintRequest.findFirst({
    where: { orderId: opts.orderId, status: "PENDING" },
    orderBy: { createdAt: "asc" }
  });
  if (!pending) return fail(400, "No reprint is waiting");
  if (opts.action === "reject") {
    await prisma.shopReprintRequest.update({ where: { id: pending.id }, data: { status: "REJECTED" } });
    await logAudit({
      userId: opts.userId,
      action: "shop.reprint",
      entity: "ShopOrder",
      entityId: opts.orderId,
      metadata: { comment: `Reprint rejected (${pending.reason})`, status: "REJECTED" }
    });
    return ok({ status: "REJECTED" as const });
  }
  await prisma.shopReprintRequest.update({ where: { id: pending.id }, data: { status: "APPROVED" } });
  const moved = await moveShopOrder({
    orderId: opts.orderId,
    to: "REPRINT",
    actor: "admin",
    userId: opts.userId,
    reprintApproved: true,
    comment: pending.reason
  });
  if (!moved.ok) {
    await prisma.shopReprintRequest.update({ where: { id: pending.id }, data: { status: "PENDING" } });
    return moved;
  }
  return ok({ status: "REPRINT" as const });
}
