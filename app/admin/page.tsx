import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR, formatNumber, timeAgo } from "@/lib/utils";
import {
  Users,
  Building2,
  Star,
  CreditCard,
  TrendingUp,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { getPaymentsConfig, getEmailConfig, getWhatsAppConfig } from "@/lib/settings";

export default async function AdminOverview() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    activeUsers,
    newUsers7,
    businessCount,
    reviewCount,
    feedbackCount,
    revenueAgg,
    revenue30Agg,
    pendingPayments,
    recentUsers,
    payments,
    plansStat
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { subscriptionStatus: { in: ["ACTIVE", "TRIALING"] } } }),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.business.count({ where: { archived: false } }),
    prisma.review.count(),
    prisma.feedback.count({ where: { status: "NEW" } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" }
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED", createdAt: { gte: since30 } }
    }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        createdAt: true
      }
    }),
    prisma.payment.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { email: true, name: true } } }
    }),
    prisma.user.groupBy({
      by: ["subscriptionTier"],
      _count: { _all: true }
    })
  ]);

  const totalRevenue = revenueAgg._sum.amount || 0;
  const revenue30 = revenue30Agg._sum.amount || 0;

  const [payCfg, emailCfg, waCfg] = await Promise.all([
    getPaymentsConfig(),
    getEmailConfig(),
    getWhatsAppConfig()
  ]);

  const checks = [
    {
      ok: !!(payCfg.razorpayKeyId && payCfg.razorpayKeySecret),
      label: "Razorpay configured",
      href: "/admin/payments"
    },
    {
      ok: !!(emailCfg.relayUrl || (emailCfg.smtpHost && emailCfg.smtpUser)),
      label: "Email transport configured",
      href: "/admin/email"
    },
    {
      ok: !!(waCfg.apiToken && waCfg.phoneId),
      label: "WhatsApp Cloud API (optional)",
      href: "/admin/whatsapp"
    }
  ];

  const tiles = [
    {
      label: "Total users",
      value: formatNumber(userCount),
      sub: `${formatNumber(activeUsers)} active · +${newUsers7} this week`,
      icon: Users,
      href: "/admin/users"
    },
    {
      label: "Businesses",
      value: formatNumber(businessCount),
      sub: `${formatNumber(reviewCount)} total reviews`,
      icon: Building2,
      href: "/admin/businesses"
    },
    {
      label: "Open feedback",
      value: formatNumber(feedbackCount),
      sub: feedbackCount > 0 ? "Awaiting reply" : "All clear",
      icon: Star,
      href: "/admin/businesses"
    },
    {
      label: "Total revenue",
      value: formatINR(totalRevenue),
      sub: `${formatINR(revenue30)} (30d) · ${pendingPayments} pending`,
      icon: TrendingUp,
      href: "/admin/payments"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Admin overview</h1>
        <p className="text-sm text-muted-foreground">System-wide activity and configuration</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-soft transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{t.label}</span>
              <t.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-2">{t.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent signups</CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet.</p>
            ) : (
              <ul className="divide-y -mx-2">
                {recentUsers.map((u) => (
                  <li key={u.id} className="py-2.5 px-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{u.name || u.email}</div>
                      <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium">{u.subscriptionTier}</div>
                      <div className="text-[11px] text-muted-foreground">{timeAgo(u.createdAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/users"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              View all users <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(["FREE", "STARTER", "GROWTH", "AGENCY"] as const).map((tier) => {
                const row = plansStat.find((p) => p.subscriptionTier === tier);
                const c = row?._count._all || 0;
                return (
                  <li key={tier} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{tier}</span>
                    <span className="font-medium">{formatNumber(c)}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed payments yet.</p>
            ) : (
              <ul className="divide-y -mx-2">
                {payments.map((p) => (
                  <li key={p.id} className="py-2.5 px-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {p.user.name || p.user.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.tier} · {p.periodMonths === 12 ? "yearly" : "monthly"} ·{" "}
                        {timeAgo(p.createdAt)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{formatINR(p.amount)}</div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/payments"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              All payments <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-sm"
                  >
                    <span className="flex items-center gap-2">
                      {c.ok ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      {c.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.ok ? "OK" : "Configure"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
