import { cursorQuery, isPageError, readPage } from "@/lib/api/cursor";
import { takePage } from "@/lib/api/page";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { moveShopOrder } from "@/lib/shop/order-move";
import { isShopOrderStatus, moveError, SHOP_ORDER_STATUSES } from "@/lib/shop/order-status";
import { maskPhone } from "./mask";
import { publicShopProof } from "./shop-proof";

const STATUSES = new Set<string>(SHOP_ORDER_STATUSES);

export async function listAdminShopOrders(search: URLSearchParams) {
  const page = readPage(search);
  if (isPageError(page)) return fail(400, page.error);
  const status = (search.get("status") || "").trim();
  if (status && !STATUSES.has(status)) return fail(400, "Unknown order status");
  const [listed, variants] = await Promise.all([
    takePage(
      () =>
        prisma.shopOrder.findMany({
          where: status ? { status: status as (typeof SHOP_ORDER_STATUSES)[number] } : {},
          orderBy: { id: "desc" },
          ...cursorQuery(page.cursorId, page.limit),
          select: {
            id: true,
            status: true,
            totalPaise: true,
            invoiceNumber: true,
            createdAt: true,
            business: { select: { name: true } },
            user: { select: { name: true, phone: true } }
          }
        }),
      page.limit
    ),
    prisma.catalogVariant.findMany({
      where: { active: true },
      orderBy: { stock: "asc" },
      take: 40,
      select: { id: true, sku: true, name: true, stock: true, lowStockAt: true }
    })
  ]);
  if (!listed.ok) return listed;
  return ok({
    items: listed.data.items.map((row) => ({
      id: row.id,
      status: row.status,
      totalPaise: row.totalPaise,
      invoiceNumber: row.invoiceNumber,
      createdAt: row.createdAt.toISOString(),
      business: row.business?.name || null,
      name: row.user.name,
      phone: maskPhone(row.user.phone)
    })),
    nextCursor: listed.data.nextCursor,
    lowStock: variants
      .filter((row) => row.stock <= row.lowStockAt)
      .slice(0, 20)
      .map((row) => ({ id: row.id, sku: row.sku, name: row.name, stock: row.stock, lowStockAt: row.lowStockAt }))
  });
}

export async function loadAdminShopOrder(id: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id },
    include: {
      lines: true,
      shipment: true,
      business: { select: { name: true } },
      user: { select: { name: true, phone: true, email: true } }
    }
  });
  if (!order) return fail(404, "Order not found");
  return ok({
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalPaise: order.totalPaise,
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    advancePaise: order.advancePaise,
    balancePaise: order.balancePaise,
    invoiceNumber: order.invoiceNumber,
    buyerLegalName: order.buyerLegalName,
    business: order.business?.name || null,
    name: order.user.name,
    email: order.user.email,
    phone: maskPhone(order.user.phone),
    createdAt: order.createdAt.toISOString(),
    shipment: order.shipment
      ? {
          awb: order.shipment.awb,
          courierName: order.shipment.courierName,
          provider: order.shipment.provider,
          shipmentId: order.shipment.shipmentId
        }
      : null,
    lines: order.lines.map((line) => ({
      id: line.id,
      sku: line.sku,
      name: line.name,
      qty: line.qty,
      unitPaise: line.unitPaise,
      pricePaise: line.unitPaise,
      needsNfc: line.needsNfc,
      ...publicShopProof(order.id, line.id, line.proofUrl)
    }))
  });
}

type ShopAudit = { userId: string; deviceId?: string | null; ip?: string | null };

export async function moveAdminShopOrder(id: string, to: string, comment: string | undefined, audit: ShopAudit) {
  return moveShopOrder({
    orderId: id,
    to,
    actor: "admin",
    userId: audit.userId,
    comment,
    deviceId: audit.deviceId,
    ip: audit.ip
  });
}

export async function approveAdminShopProof(id: string, audit: ShopAudit) {
  return moveShopOrder({
    orderId: id,
    to: "APPROVED",
    actor: "admin",
    userId: audit.userId,
    deviceId: audit.deviceId,
    ip: audit.ip
  });
}

/** Saves the airway bill. Moves to Shipped only when the state machine already allows it. */
export async function trackAdminShopOrder(id: string, awb: string, courierName: string | undefined, audit: ShopAudit) {
  const code = awb.trim();
  if (code.length < 4) return fail(400, "Enter a tracking number");
  const order = await prisma.shopOrder.findUnique({
    where: { id },
    include: { lines: { select: { needsNfc: true } } }
  });
  if (!order) return fail(404, "Order not found");
  await prisma.shopShipment.upsert({
    where: { orderId: id },
    create: {
      orderId: id,
      provider: "manual",
      shipmentId: code.slice(0, 64),
      awb: code.slice(0, 64),
      courierName: courierName?.trim().slice(0, 80) || null
    },
    update: {
      provider: "manual",
      awb: code.slice(0, 64),
      courierName: courierName?.trim().slice(0, 80) || null
    }
  });
  const legal =
    isShopOrderStatus(order.status) &&
    !moveError(order.status, "SHIPPED", {
      actor: "admin",
      anyLineNeedsNfc: order.lines.some((line) => line.needsNfc),
      reprintApproved: false
    });
  if (legal) {
    const moved = await moveShopOrder({
      orderId: id,
      to: "SHIPPED",
      actor: "admin",
      userId: audit.userId,
      deviceId: audit.deviceId,
      ip: audit.ip
    });
    if (!moved.ok) return moved;
    return ok({ moved: true, awb: code.slice(0, 64), status: moved.data.status });
  }
  return ok({ moved: false, awb: code.slice(0, 64), status: order.status });
}
