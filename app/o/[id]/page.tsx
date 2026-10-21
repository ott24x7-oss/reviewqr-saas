import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { keepReorderLines, toPublicStatus } from "@/lib/store/order-public";
import { StatusView } from "./status-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order status",
  robots: { index: false, follow: false }
};

export default async function OrderStatusPage({ params }: { params: { id: string } }) {
  const order = await prisma.menuOrder.findUnique({
    where: { id: params.id },
    include: {
      business: { select: { name: true, isActive: true, archived: true } },
      qrCode: { select: { shortCode: true, status: true } }
    }
  });
  if (!order || !order.business.isActive || order.business.archived) notFound();

  const stored = Array.isArray(order.items) ? order.items : [];
  const ids = stored.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const id = (line as { id?: unknown }).id;
    return typeof id === "string" ? [id] : [];
  });
  const catalog = ids.length
    ? await prisma.menuItem.findMany({
        where: { businessId: order.businessId, id: { in: ids } },
        include: { variants: true, addOns: true }
      })
    : [];
  const reorder = keepReorderLines(order.items, catalog);
  const view = toPublicStatus({
    number: order.number,
    businessName: order.business.name,
    status: order.status,
    lang: order.lang,
    createdAt: order.createdAt,
    orderType: order.orderType,
    items: order.items,
    totalPaise: order.totalPaise,
    events: order.events,
    reorderCode: order.qrCode?.status === "ACTIVE" ? order.qrCode.shortCode : null
  });

  return <StatusView order={view} reorder={reorder} />;
}
