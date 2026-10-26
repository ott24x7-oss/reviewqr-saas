/** Apply one allowed shop-order move and write the audit row the owner timeline reads. */
import { fail, ok } from "@/lib/api/result";
import { logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { enqueueJob } from "@/lib/jobs/store";
import { isShopOrderStatus, moveError, type ShopMoveActor, type ShopOrderStatusName } from "./order-status";

export async function moveShopOrder(opts: {
  orderId: string;
  to: string;
  actor: ShopMoveActor;
  userId: string;
  comment?: string | null;
  reprintApproved?: boolean;
  via?: string | null;
  deviceId?: string | null;
  ip?: string | null;
}) {
  if (!isShopOrderStatus(opts.to)) return fail(400, "That status change is not allowed");
  const order = await prisma.shopOrder.findUnique({
    where: { id: opts.orderId },
    include: { lines: { select: { needsNfc: true } } }
  });
  if (!order) return fail(404, "Order not found");
  if (!isShopOrderStatus(order.status)) return fail(400, "That status change is not allowed");
  const problem = moveError(order.status, opts.to, {
    actor: opts.actor,
    anyLineNeedsNfc: order.lines.some((line) => line.needsNfc),
    reprintApproved: opts.reprintApproved === true,
    comment: opts.comment
  });
  if (problem) return fail(400, problem);
  const to: ShopOrderStatusName = opts.to;
  await prisma.shopOrder.update({ where: { id: order.id }, data: { status: to } });
  if (to === "CHANGES_REQUESTED" && opts.comment?.trim()) {
    await prisma.shopOrderLine.updateMany({
      where: { orderId: order.id },
      data: { changeComment: opts.comment.trim() }
    });
  }
  await logAudit({
    userId: opts.userId,
    action: "shop.order.move",
    entity: "ShopOrder",
    entityId: order.id,
    deviceId: opts.deviceId,
    ip: opts.ip || undefined,
    metadata: { from: order.status, to, comment: opts.comment?.trim() || null, via: opts.via || null }
  });
  try {
    await enqueueJob({
      type: "shop.notify",
      payload: { orderId: order.id, status: to },
      idempotencyKey: `shop.notify:${order.id}:${order.status}:${to}`
    });
  } catch (error) {
    console.warn("[shop] could not queue the status notice", error);
  }
  return ok({ status: to });
}
