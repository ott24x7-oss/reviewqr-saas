import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getShippingConfig } from "@/lib/settings";
import { isShopOrderStatus } from "@/lib/shop/order-status";
import { adminCarrierState } from "@/lib/shop/shipping";
import { ProductionBoard, type ProductionCard } from "@/components/admin/production-board";
import { loadEntitlement } from "@/lib/plans/entitlements";
import { hideBusinessBranding } from "@/lib/branding/hide-business-branding";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  await requireAdminPage();
  const carrierState = adminCarrierState(await getShippingConfig(), process.env.NODE_ENV);
  const orders = await prisma.shopOrder.findMany({
    where: { status: { not: "PENDING_PAYMENT" } },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      buyerLegalName: true,
      business: { select: { name: true, ownerId: true, hideBranding: true, hideBrandingSource: true } },
      lines: { select: { id: true, name: true, needsNfc: true, ships: true, unbranded: true } }
    }
  });
  const owners = [...new Set(orders.flatMap((order) => order.business?.ownerId ? [order.business.ownerId] : []))];
  const agencyOwners = new Set((await Promise.all(owners.map(async (ownerId) => {
    const entitlement = await loadEntitlement(ownerId).catch(() => null);
    return entitlement?.tier === "AGENCY" ? ownerId : null;
  }))).filter((ownerId): ownerId is string => ownerId != null));
  const hiddenBusinesses = new Set(orders.flatMap((order) => order.business && hideBusinessBranding({
    enabled: order.business.hideBranding,
    source: order.business.hideBrandingSource,
    agencyPlan: agencyOwners.has(order.business.ownerId)
  }) ? [order.id] : []));
  const proved = await prisma.shopOrderLine.findMany({
    where: { orderId: { in: orders.map((order) => order.id) }, proofUrl: { not: null } },
    select: { id: true }
  });
  const provedIds = new Set(proved.map((line) => line.id));
  const shipments = await prisma.shopShipment.findMany({
    where: { orderId: { in: orders.map((order) => order.id) } },
    select: { orderId: true, awb: true, lastError: true }
  });
  const shipmentByOrder = new Map(shipments.map((row) => [row.orderId, row]));
  const pendingReprints = await prisma.shopReprintRequest.findMany({
    where: { orderId: { in: orders.map((order) => order.id) }, status: "PENDING" },
    select: { orderId: true }
  });
  const pendingReprintIds = new Set(pendingReprints.map((row) => row.orderId));
  const cards: ProductionCard[] = [];
  for (const order of orders) {
    if (!isShopOrderStatus(order.status) || order.status === "PENDING_PAYMENT") continue;
    const shipment = shipmentByOrder.get(order.id);
    cards.push({
      id: order.id,
      status: order.status,
      businessName: order.business?.name || order.buyerLegalName || "QR24x7",
      anyLineNeedsNfc: order.lines.some((line) => line.needsNfc),
      ships: order.lines.some((line) => line.ships),
      awb: shipment?.awb ?? null,
      lastError: shipment?.lastError ?? null,
      pendingReprint: pendingReprintIds.has(order.id),
      hasUnbranded: order.lines.some((line) => line.unbranded || hiddenBusinesses.has(order.id)),
      lines: order.lines.map((line) => ({ id: line.id, name: line.name, hasProof: provedIds.has(line.id), unbranded: line.unbranded || hiddenBusinesses.has(order.id) }))
    });
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Production</h1>
        <p className="text-sm text-muted-foreground">Paid hardware orders, design proofs, and the print file.</p>
      </div>
      <ProductionBoard cards={cards} carrierState={carrierState} />
    </div>
  );
}
