import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { formatRupees } from "@/lib/tap/order-message";
import { loadCustomers } from "@/lib/store/customer-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerTags } from "./customer-tags";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const customers = await loadCustomers(user.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-display sm:text-2xl">Customers</h1>
          <p className="text-sm text-muted-foreground">
            People who agreed to save their phone on an order or on feedback. Inactive means no consented order in the last 60 days.
          </p>
        </div>
        <Button asChild variant="outline" className="h-11 min-h-11">
          <Link href="/api/customers/export">Download CSV</Link>
        </Button>
      </div>
      {customers.length === 0 ? <p className="text-sm text-muted-foreground">No customers yet.</p> : null}
      <div className="grid grid-cols-1 gap-3">
        {customers.map((customer) => (
          <Card key={customer.id}>
            <CardContent className="space-y-2 p-4 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{customer.name || "No name"}</div>
                  <div className="text-sm">{customer.phone}</div>
                  <div className="text-sm text-muted-foreground">{customer.businessName}</div>
                </div>
                {customer.inactive ? <Badge variant="secondary">Inactive</Badge> : null}
              </div>
              <p className="text-sm">
                {customer.orders} {customer.orders === 1 ? "order" : "orders"} · {formatRupees(customer.spendPaise)}
                {customer.lastOrderLabel ? ` · Last order ${customer.lastOrderLabel}` : ""}
              </p>
              <CustomerTags id={customer.id} tags={customer.tags} canManage={customer.canManage} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
