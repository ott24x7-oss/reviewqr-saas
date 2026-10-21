import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadOrderCards } from "@/lib/store/order-feed";
import { OrdersBoard } from "./orders-board";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const orders = await loadOrderCards(user.id);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold font-display sm:text-2xl">Orders</h1>
        <p className="text-sm text-muted-foreground">Orders appear here. This page checks for new ones every 15 seconds.</p>
      </div>
      <OrdersBoard initial={orders} />
    </div>
  );
}
