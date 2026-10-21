import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { isShopOrderStatus } from "@/lib/shop/order-status";
import { ProductionBoard, type ProductionCard } from "@/components/admin/production-board";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  await requireAdminPage();
  const orders = await prisma.shopOrder.findMany({
    where: { status: { not: "PENDING_PAYMENT" } },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      buyerLegalName: true,
      business: { select: { name: true } },
      lines: { select: { id: true, name: true, needsNfc: true } }
    }
  });
  const proved = await prisma.shopOrderLine.findMany({
    where: { orderId: { in: orders.map((order) => order.id) }, proofUrl: { not: null } },
    select: { id: true }
  });
  const provedIds = new Set(proved.map((line) => line.id));
  const cards: ProductionCard[] = [];
  for (const order of orders) {
    if (!isShopOrderStatus(order.status) || order.status === "PENDING_PAYMENT") continue;
    cards.push({
      id: order.id,
      status: order.status,
      businessName: order.business?.name || order.buyerLegalName || "ReviewQR",
      anyLineNeedsNfc: order.lines.some((line) => line.needsNfc),
      lines: order.lines.map((line) => ({ id: line.id, name: line.name, hasProof: provedIds.has(line.id) }))
    });
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Production</h1>
        <p className="text-sm text-muted-foreground">Paid hardware orders, design proofs, and the print file.</p>
      </div>
      <ProductionBoard cards={cards} />
    </div>
  );
}
