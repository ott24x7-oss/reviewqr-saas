import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { isShopOrderStatus, shopStatusLabel } from "./order-status";

function labelFrom(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "Updated";
  const to = (metadata as { to?: unknown }).to;
  return typeof to === "string" && isShopOrderStatus(to) ? shopStatusLabel(to) : "Updated";
}

/** One hardware order, its payment state, and the status timeline. */
export async function readShopOrder(userId: string, orderId: string) {
  const order = await prisma.shopOrder.findFirst({
    where: { id: orderId, userId },
    include: {
      lines: { select: { sku: true, name: true, qty: true, unitPaise: true } },
      reprintRequests: { select: { id: true, reason: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!order) return fail(404, "Not found");
  const moves = await prisma.auditLog.findMany({
    where: { entity: "ShopOrder", entityId: order.id, action: "shop.order.move" },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, metadata: true }
  });
  return ok({
    id: order.id,
    status: order.status,
    statusLabel: isShopOrderStatus(order.status) ? shopStatusLabel(order.status) : order.status,
    paymentStatus: order.paymentStatus,
    totalPaise: order.totalPaise,
    invoiceNumber: order.invoiceNumber,
    checkoutUrl: order.checkoutUrl,
    createdAt: order.createdAt.toISOString(),
    lines: order.lines,
    timeline: [
      { label: "Order placed", at: order.createdAt.toISOString() },
      ...moves.map((row) => ({ label: labelFrom(row.metadata), at: row.createdAt.toISOString() }))
    ],
    reprints: order.reprintRequests.map((row) => ({
      id: row.id,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString()
    }))
  });
}
