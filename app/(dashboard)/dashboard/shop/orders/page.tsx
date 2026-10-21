import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isShopOrderStatus, shopStatusLabel } from "@/lib/shop/order-status";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ShopOrdersPage() {
  const user = await getCurrentUser();
  if (!user) notFound();
  const orders = await prisma.shopOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { lines: true }
  });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/dashboard/shop" className="text-sm text-muted-ink">Shop</Link>
      <h1 className="font-display text-2xl font-bold text-ink">Your orders</h1>
      {orders.length === 0 && <p className="rounded-[20px] bg-white p-4 text-sm text-ink">No orders yet.</p>}
      {orders.map((order) => (
        <Link key={order.id} href={`/dashboard/shop/orders/${order.id}`} className="block rounded-[20px] bg-white p-4 text-ink shadow-sm">
          <p className="font-semibold">{isShopOrderStatus(order.status) ? shopStatusLabel(order.status) : order.status}</p>
          <p className="mt-1 text-sm">{order.lines.map((line) => `${line.name} × ${line.qty}`).join(", ")}</p>
          <p className="mt-1 text-sm">{formatINR(order.totalPaise)}{order.invoiceNumber ? ` · ${order.invoiceNumber}` : ""}</p>
        </Link>
      ))}
    </div>
  );
}
