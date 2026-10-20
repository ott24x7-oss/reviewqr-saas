import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readableBusinessWhere } from "@/lib/tenant";
import { formatRupees } from "@/lib/tap/order-message";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const orders = await prisma.menuOrder.findMany({
    where: { business: readableBusinessWhere(user.id) },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { business: { select: { name: true } } }
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display">Orders</h1>
        <p className="text-sm text-muted-foreground">WhatsApp orders saved from the menu.</p>
      </div>
      {orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : null}
      <div className="grid grid-cols-1 gap-3">
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold">{order.number}</div>
                <div>{formatRupees(order.totalPaise)}</div>
              </div>
              <div className="text-sm text-muted-foreground">{order.business.name}</div>
              <div className="text-sm">{[order.customerName, order.tableOrAddress].filter(Boolean).join(" · ") || "No name"}</div>
              <ul className="text-sm">
                {linesOf(order.items).map((line, index) => (
                  <li key={`${order.id}-${index}`}>{line.qty} × {line.name}</li>
                ))}
              </ul>
              {order.note ? <p className="text-sm text-muted-foreground">{order.note}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function linesOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const row = line as { name?: unknown; qty?: unknown };
    if (typeof row.name !== "string") return [];
    return [{ name: row.name, qty: typeof row.qty === "number" ? row.qty : 1 }];
  });
}
