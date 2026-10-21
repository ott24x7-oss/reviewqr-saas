import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getShippingConfig } from "@/lib/settings";
import { isShopOrderStatus } from "@/lib/shop/order-status";
import { adminCarrierState } from "@/lib/shop/shipping";
import { ProductionBoard, type ProductionCard } from "@/components/admin/production-board";

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
      business: { select: { name: true } },
      lines: { select: { id: true, name: true, needsNfc: true, ships: true } }
    }
  });
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
      businessName: order.business?.name || order.buyerLegalName || "ReviewQR",
      anyLineNeedsNfc: order.lines.some((line) => line.needsNfc),
      ships: order.lines.some((line) => line.ships),
      awb: shipment?.awb ?? null,
      lastError: shipment?.lastError ?? null,
      pendingReprint: pendingReprintIds.has(order.id),
      lines: order.lines.map((line) => ({ id: line.id, name: line.name, hasProof: provedIds.has(line.id) }))
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
