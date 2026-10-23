import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPlans } from "@/lib/payments";
import { getPaymentsConfig } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingClient } from "./billing-client";
import { HelpLink } from "@/components/help/help-link";
import { PayNowButton } from "@/components/billing/pay-now";
import { prisma } from "@/lib/db";
import { formatINR, formatDate } from "@/lib/utils";
import { planDescriptionOrDefault } from "@/lib/brand-defaults";
import { billingPaymentWhere } from "@/lib/plans/invoice-guard";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams
}: {
  searchParams?: { plan?: string; duration?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const payments = await prisma.payment.findMany({
    where: billingPaymentWhere(user.id),
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const plans = await getPlans();
  const cfg = await getPaymentsConfig();
  const [catalog, subscription] = await Promise.all([
    prisma.plan.findMany({
      where: { active: true, visibleOnPricingPage: true },
      orderBy: { sortOrder: "asc" },
      include: { prices: { where: { active: true } } }
    }),
    prisma.subscription.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" }
    })
  ]);
  const pending = subscription?.pendingPlanId
    ? await prisma.plan.findUnique({ where: { id: subscription.pendingPlanId }, select: { nameEn: true } })
    : null;
  const current = plans[user.subscriptionTier];
  const trialDays = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan, view invoices, and upgrade
        </p>
        </div>
        <HelpLink context="billing" page="Billing" />
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
              {pending && (
                <p className="text-xs text-muted-foreground mt-1">
                  Changes to {pending.nameEn} when this period ends.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <BillingClient
        currentTier={user.subscriptionTier}
        plans={plans}
        upiEnabled={cfg.upiEnabled && !!cfg.upiId}
        usdtEnabled={cfg.usdtEnabled && !!cfg.usdtAddress}
        youpiEnabled={!!(cfg.youpiBaseUrl && cfg.youpiMerchantId)}
        initialSlug={searchParams?.plan || ""}
        initialDuration={searchParams?.duration || ""}
        catalog={catalog.map((plan) => ({
          slug: plan.slug,
          name: plan.nameEn,
          description: planDescriptionOrDefault(plan.descriptionEn),
          badge: plan.badge,
          modules: plan.modules,
          legacyTier: plan.legacyTier,
          prices: plan.prices.map((price) => ({
            duration: price.duration,
            pricePaise: price.pricePaise,
            mrpPaise: price.mrpPaise
          }))
        }))}
      />

      {payments.some((payment) => (payment.status === "PENDING" || payment.status === "QUEUED") && payment.provider === "YOUPI" && payment.amount > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>Invoice to pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments
              .filter((payment) => (payment.status === "PENDING" || payment.status === "QUEUED") && payment.provider === "YOUPI" && payment.amount > 0)
              .map((payment) => (
                <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3" data-testid="pending-invoice">
                  <div>
                    <p className="font-medium">{formatINR(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">{payment.status}</p>
                  </div>
                  <PayNowButton paymentId={payment.id} />
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}

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
                    <th className="text-right py-2 px-2">Invoice</th>
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
                      <td className="py-2 px-2 text-right">
                        {p.invoiceNumber ? (
                          <a className="text-primary text-xs font-medium" href={`/api/billing/invoices/${p.id}`}>
                            {p.invoiceNumber}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
