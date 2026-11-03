import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { isShopOrderStatus, shopStatusLabel } from "./order-status";
import { canManageShopOrder } from "./order-access";
import { publicShopProof } from "@/lib/admin/shop-proof";
import { shopTrackingUrl } from "./tracking-url";

function addressFrom(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const text = (key: string) => typeof row[key] === "string" ? row[key] as string : "";
  return {
    name: text("name"), phone: text("phone"), line1: text("line1"), line2: text("line2") || null,
    city: text("city"), state: text("state"), pincode: text("pincode")
  };
}

function labelFrom(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "Updated";
  const to = (metadata as { to?: unknown }).to;
  return typeof to === "string" && isShopOrderStatus(to) ? shopStatusLabel(to) : "Updated";
}

/** One hardware order, its payment state, and the status timeline. */
export async function readShopOrder(userId: string, orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: {
      lines: { select: { id: true, sku: true, name: true, qty: true, unitPaise: true, variant: { select: { imageUrl: true } }, proofUrl: true } },
      shipment: { select: { provider: true, courierName: true, awb: true, ndrNote: true } },
      reprintRequests: { select: { id: true, reason: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } }
    }
  });
  if (!order || !(await canManageShopOrder(userId, order))) return fail(404, "Not found");
  const [moves, latestCarrierEvent] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entity: "ShopOrder", entityId: order.id, action: "shop.order.move" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, metadata: true }
    }),
    order.shipment
      ? prisma.shopCarrierEvent.findFirst({
          where: { orderId: order.id },
          orderBy: { createdAt: "desc" },
          select: { status: true, createdAt: true }
        })
      : Promise.resolve(null)
  ]);
  return ok({
    id: order.id,
    status: order.status,
    statusLabel: isShopOrderStatus(order.status) ? shopStatusLabel(order.status) : order.status,
    paymentStatus: order.paymentStatus,
    totalPaise: order.totalPaise,
    invoiceNumber: order.invoiceNumber,
    checkoutUrl: order.checkoutUrl,
    createdAt: order.createdAt.toISOString(),
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    taxablePaise: order.taxablePaise,
    cgstPaise: order.cgstPaise,
    sgstPaise: order.sgstPaise,
    igstPaise: order.igstPaise,
    lines: order.lines.map((line) => ({
      sku: line.sku,
      name: line.name,
      qty: line.qty,
      unitPaise: line.unitPaise,
      imageUrl: line.variant?.imageUrl ?? null,
      proof: order.status === "PROOF_SENT" ? publicShopProof(order.id, line.id, line.proofUrl) : null
    })),
    shipment: order.shipment ? {
      provider: order.shipment.provider,
      courierName: order.shipment.courierName,
      awb: order.shipment.awb,
      trackingUrl: shopTrackingUrl(order.shipment.provider, order.shipment.awb),
      ndrNote: order.shipment.ndrNote,
      latestEvent: latestCarrierEvent ? { status: latestCarrierEvent.status, at: latestCarrierEvent.createdAt.toISOString() } : null,
      etaDays: null
    } : null,
    address: addressFrom(order.addressJson),
    invoiceDownloadUrl: null,
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
