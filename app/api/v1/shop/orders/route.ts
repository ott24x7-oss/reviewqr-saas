import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data } from "@/lib/api/v1";
import { prisma } from "@/lib/db";
import { isShopOrderStatus, shopStatusLabel } from "@/lib/shop/order-status";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const orders = await prisma.shopOrder.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { lines: { select: { sku: true, name: true, qty: true } } }
  });
  return v1Data({
    items: orders.map((order) => ({
      id: order.id,
      status: order.status,
      statusLabel: isShopOrderStatus(order.status) ? shopStatusLabel(order.status) : order.status,
      paymentStatus: order.paymentStatus,
      totalPaise: order.totalPaise,
      advancePaise: order.advancePaise,
      balancePaise: order.balancePaise,
      invoiceNumber: order.invoiceNumber,
      createdAt: order.createdAt,
      lines: order.lines
    }))
  });
}

export const GET = observe(getHandler);
