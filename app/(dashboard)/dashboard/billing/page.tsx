import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PLANS } from "@/lib/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingClient } from "./billing-client";
import { prisma } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const current = PLANS[user.subscriptionTier];
  const trialDays = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan, view invoices, and upgrade
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{current.name}</span>
                <Badge variant={user.subscriptionStatus === "ACTIVE" ? "success" : "warning"}>
                  {user.subscriptionStatus}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{current.tagline}</p>
              {user.subscriptionStatus === "TRIALING" && trialDays > 0 && (
                <p className="text-sm text-amber-600 font-medium mt-2">
                  ⏰ {trialDays} day{trialDays !== 1 ? "s" : ""} left in trial
                </p>
              )}
              {user.subscriptionEndsAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renews on {formatDate(user.subscriptionEndsAt)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <BillingClient currentTier={user.subscriptionTier} />

      <Card>
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Plan</th>
                    <th className="text-right py-2 px-2">Amount</th>
                    <th className="text-right py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 px-2">{formatDate(p.createdAt)}</td>
                      <td className="py-2 px-2">
                        {p.tier} ({p.periodMonths === 12 ? "yearly" : "monthly"})
                      </td>
                      <td className="py-2 px-2 text-right font-medium">{formatINR(p.amount)}</td>
                      <td className="py-2 px-2 text-right">
                        <Badge
                          variant={
                            p.status === "COMPLETED"
                              ? "success"
                              : p.status === "PENDING"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
