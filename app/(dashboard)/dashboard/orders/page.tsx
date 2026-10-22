import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadDaySummary, loadOrderCards } from "@/lib/store/order-feed";
import { moduleBlock, upsellOffer } from "@/lib/plans/entitlements";
import { ModuleUpsell } from "@/components/plans/module-upsell";
import { prisma } from "@/lib/db";
import { OrdersBoard } from "./orders-board";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const owned = await prisma.business.findFirst({ where: { ownerId: user.id, archived: false }, select: { id: true } });
  if (owned) {
    const locked = await moduleBlock(user.id, "STORE");
    if (locked) {
      const offer = await upsellOffer("STORE");
      return <ModuleUpsell title={offer.title} body={locked} href={offer.href} />;
    }
  }
  const [orders, summary] = await Promise.all([loadOrderCards(user.id), loadDaySummary(user.id)]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold font-display sm:text-2xl">Orders</h1>
        <p className="text-sm text-muted-foreground">Orders appear here. This page checks for new ones every 15 seconds.</p>
      </div>
      <OrdersBoard initial={orders} summary={summary} />
    </div>
  );
}
