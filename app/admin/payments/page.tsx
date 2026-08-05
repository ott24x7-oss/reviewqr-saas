import { prisma } from "@/lib/db";
import { getPaymentsConfig } from "@/lib/settings";
import { maskSecret } from "@/lib/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDate } from "@/lib/utils";
import { PaymentsConfigForm } from "./payments-form";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const cfg = await getPaymentsConfig();

  const [payments, agg, agg30] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { email: true, name: true } } }
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
      where: { status: "COMPLETED" }
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
      where: { status: "COMPLETED", createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } }
    })
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Configure payment providers and view transactions
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-muted-foreground">Total revenue</div>
          <div className="text-2xl font-bold mt-1">{formatINR(agg._sum.amount || 0)}</div>
        </div>
        <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-muted-foreground">Last 30 days</div>
          <div className="text-2xl font-bold mt-1">{formatINR(agg30._sum.amount || 0)}</div>
        </div>
        <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-muted-foreground">Completed</div>
          <div className="text-2xl font-bold mt-1">{agg._count._all}</div>
        </div>
        <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="text-xs text-muted-foreground">Last 30d count</div>
          <div className="text-2xl font-bold mt-1">{agg30._count._all}</div>
        </div>
      </div>

      <PaymentsConfigForm
        initial={{
          ...cfg,
          // Never ship raw secrets to the browser — mask every credential.
          mailImapPass: maskSecret(cfg.mailImapPass),
          razorpayKeySecret: maskSecret(cfg.razorpayKeySecret),
          razorpayWebhookSecret: maskSecret(cfg.razorpayWebhookSecret),
          stripeSecretKey: maskSecret(cfg.stripeSecretKey),
          stripeWebhookSecret: maskSecret(cfg.stripeWebhookSecret)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-slate-800 text-xs text-muted-foreground">
                  <th className="text-left py-2.5 px-4">Date</th>
                  <th className="text-left py-2.5 px-4">User</th>
                  <th className="text-left py-2.5 px-4">Plan</th>
                  <th className="text-left py-2.5 px-4">Provider</th>
                  <th className="text-right py-2.5 px-4">Amount</th>
                  <th className="text-right py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b dark:border-slate-800 last:border-0">
                    <td className="py-2.5 px-4 text-xs">{formatDate(p.createdAt)}</td>
                    <td className="py-2.5 px-4">
                      <div className="text-sm">{p.user.name || p.user.email}</div>
                      <div className="text-xs text-muted-foreground">{p.user.email}</div>
                    </td>
                    <td className="py-2.5 px-4 text-xs">
                      {p.tier} ({p.periodMonths === 12 ? "yearly" : "monthly"})
                    </td>
                    <td className="py-2.5 px-4 text-xs">{p.provider}</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatINR(p.amount)}</td>
                    <td className="py-2.5 px-4 text-right">
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
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
