import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { isShopOrderStatus, shopStatusLabel } from "./order-status";
import { canManageShopOrder } from "./order-access";
import { publicShopProof } from "@/lib/admin/shop-proof";
import { shopTrackingUrl } from "./tracking-url";
import { shopDesignSchema } from "@reviewqr/shared";
import { getSiteConfig } from "../settings";

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

function actionLabel(action: string, metadata: unknown) {
  if (action === "shop.order.cancel.request") return "Cancellation requested";
  if (action === "shop.order.address.change") return "Delivery address updated";
  return labelFrom(metadata);
}

/** One hardware order, its payment state, and the status timeline. */
export async function readShopOrder(userId: string, orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: {
      lines: { select: { id: true, sku: true, name: true, qty: true, unitPaise: true, unbranded: true, design: true, variant: { select: { imageUrl: true } }, proofUrl: true } },
      shipment: { select: { provider: true, shipmentId: true, courierName: true, awb: true, ndrNote: true } },
      reprintRequests: { select: { id: true, reason: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      cancellationRequest: { select: { status: true, refundAmountPaise: true } }
    }
  });
  if (!order || !(await canManageShopOrder(userId, order))) return fail(404, "Not found");
  const gstRegistered = Boolean(order.sellerGstin?.trim());
  const [moves, latestCarrierEvent, site] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entity: "ShopOrder", entityId: order.id, action: { in: ["shop.order.move", "shop.order.cancel.request", "shop.order.address.change"] } },
      orderBy: { createdAt: "asc" },
      select: { action: true, createdAt: true, metadata: true }
    }),
    order.shipment
      ? prisma.shopCarrierEvent.findFirst({
          where: { orderId: order.id },
          orderBy: { createdAt: "desc" },
          select: { status: true, createdAt: true }
        })
      : Promise.resolve(null),
    getSiteConfig()
  ]);
  return ok({
    id: order.id,
    status: order.status,
    statusLabel: isShopOrderStatus(order.status) ? shopStatusLabel(order.status) : order.status,
    paymentStatus: order.paymentStatus,
    totalPaise: order.totalPaise,
    advancePaise: order.advancePaise,
    cod: order.cod,
    refundAmountPaise: order.cancellationRequest?.refundAmountPaise ?? (order.paymentStatus === "PAID" ? order.cod ? order.advancePaise : order.totalPaise : 0),
    invoiceNumber: order.invoiceNumber,
    checkoutUrl: order.checkoutUrl,
    cancellationRequestStatus: order.cancellationRequest?.status ?? null,
    supportWhatsappNumber: site.supportWhatsappNumber || null,
    createdAt: order.createdAt.toISOString(),
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    invoiceTitle: gstRegistered ? "Tax invoice" : "Bill of supply",
    ...(gstRegistered ? {
      taxablePaise: order.taxablePaise,
      cgstPaise: order.cgstPaise,
      sgstPaise: order.sgstPaise,
      igstPaise: order.igstPaise
    } : {}),
    lines: order.lines.map((line) => ({
      sku: line.sku,
      name: line.name,
      qty: line.qty,
      unitPaise: line.unitPaise,
      unbranded: line.unbranded,
      imageUrl: line.variant?.imageUrl ?? null,
      design: shopDesignSchema.safeParse(line.design).success ? shopDesignSchema.parse(line.design) : null,
      proof: order.status === "PROOF_SENT" ? publicShopProof(order.id, line.id, line.proofUrl) : null
    })),
    shipmentBooked: Boolean(order.shipment?.shipmentId || order.shipment?.awb),
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
      ...moves.map((row) => ({ label: actionLabel(row.action, row.metadata), at: row.createdAt.toISOString() }))
    ],
    reprints: order.reprintRequests.map((row) => ({
      id: row.id,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString()
    }))
  });
}
