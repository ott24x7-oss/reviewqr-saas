import Image from "next/image";
import Link from "next/link";
import { Activity, Banknote, Clock3, CreditCard, RefreshCw, Users } from "lucide-react";
import { ActivationGauge, AgentSparkline, FunnelBars, PlanMixBreakdown, RevenueChart, RevenueWaterfall } from "@/components/admin/ui/charts";
import { Timeline } from "@/components/admin/ui/detail";
import { AdminCard, AdminEmptyState } from "@/components/admin/ui/controls";
import { AdminDateRange } from "@/components/admin/ui/date-range";
import { KpiCard, PageHeader, StatStrip } from "@/components/admin/ui/primitives";
import { listAdminAudit } from "@/lib/admin/audit-query";
import { loadAdminDashboard } from "@/lib/admin/dashboard";
import { percentChange } from "@/lib/admin/dashboard-math";
import { adminSearchParams } from "@/lib/admin/web-search";
import { formatINR, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const search = adminSearchParams(searchParams);
  if (!search.get("range")) search.set("range", "7d");
  const compare = search.get("compare") !== "0";
  const [dash, activity] = await Promise.all([loadAdminDashboard(search), listAdminAudit(new URLSearchParams("limit=8"))]);
  if (!dash.ok) return <p className="text-sm text-rose-600">{dash.error}</p>;
  const data = dash.data;
  const kpis = data.kpis;
  const delta = (current: number, previous: number) => compare ? percentChange(current, previous) : null;
  const rangeLabel = ({ today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", mtd: "Month to date", qtd: "Quarter to date", ytd: "Year to date" } as Record<string, string>)[search.get("range") || "7d"] || data.range;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Home"
        subtitle={`${rangeLabel} · Revenue, subscriptions, and what needs a look.`}
        actions={<AdminDateRange range={search.get("range") || "7d"} from={search.get("from")} to={search.get("to")} compare={compare} />}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard hero icon={<Banknote className="h-[18px] w-[18px]" />} label="Revenue" value={formatINR(kpis.revenuePaise)} delta={delta(kpis.revenuePaise, kpis.previousRevenuePaise)} series={data.series.revenue} />
        <KpiCard icon={<CreditCard className="h-[18px] w-[18px]" />} label="New paid" value={formatNumber(kpis.newPaid)} delta={delta(kpis.newPaid, kpis.previousNewPaid)} series={data.series.newPaid} />
        <KpiCard icon={<RefreshCw className="h-[18px] w-[18px]" />} label="Monthly recurring" value={formatINR(kpis.mrrPaise)} />
        <KpiCard icon={<Users className="h-[18px] w-[18px]" />} label="Active subscriptions" value={formatNumber(kpis.activeSubs)} />
        <KpiCard icon={<Clock3 className="h-[18px] w-[18px]" />} label="Trials" value={formatNumber(kpis.trials)} />
        <KpiCard icon={<Clock3 className="h-[18px] w-[18px]" />} label="Expiring in 7 days" value={formatNumber(kpis.expiring)} />
        <KpiCard icon={<Activity className="h-[18px] w-[18px]" />} label="Churned" value={formatNumber(kpis.churned)} />
        <KpiCard icon={<Users className="h-[18px] w-[18px]" />} label="Signups" value={formatNumber(kpis.signups)} delta={delta(kpis.signups, kpis.previousSignups)} series={data.series.signups} />
      </div>

      <StatStrip items={[
        { label: "Scans", value: formatNumber(kpis.scans), delta: delta(kpis.scans, kpis.previousScans) },
        { label: "Shop orders", value: formatNumber(kpis.shopOrders), delta: delta(kpis.shopOrders, kpis.previousShopOrders) },
        { label: "Refunds", value: formatINR(kpis.refundsPaise), delta: delta(kpis.refundsPaise, kpis.previousRefundsPaise) },
        { label: "Annual recurring", value: formatINR(kpis.arrPaise) }
      ]} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <AdminCard className="p-4 sm:p-5">
          <div className="mb-1 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Revenue</h2><p className="mt-0.5 text-xs text-zinc-500">Daily paid amount{compare ? " · dotted line is the previous period" : ""}</p></div>{compare ? <span className="inline-flex items-center gap-2 text-[10px] text-zinc-500"><i className="h-px w-5 border-t border-dashed border-sky-500" /> Previous</span> : null}</div>
          <RevenueChart days={data.series.days} revenue={data.series.revenue} previous={data.series.previousRevenue} compare={compare} />
        </AdminCard>
        <AdminCard className="p-4 sm:p-5">
          <div className="mb-4"><h2 className="text-sm font-semibold">Subscription mix</h2><p className="mt-0.5 text-xs text-zinc-500">Active and trialing accounts by plan</p></div>
          <PlanMixBreakdown rows={data.planMix} />
        </AdminCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard className="p-4 sm:p-5">
          <div className="mb-3"><h2 className="text-sm font-semibold">Revenue waterfall</h2><p className="mt-0.5 text-xs text-zinc-500">New payments + renewals − refunds = net</p></div>
          <RevenueWaterfall {...data.waterfall} />
        </AdminCard>
        <AdminCard className="p-4 sm:p-5">
          <div className="mb-3"><h2 className="text-sm font-semibold">Signup to paid</h2><p className="mt-0.5 text-xs text-zinc-500">How new accounts move through setup</p></div>
          <FunnelBars steps={data.funnel} />
        </AdminCard>
        <AdminCard className="p-4 sm:p-5">
          <div className="mb-3"><h2 className="text-sm font-semibold">Activation</h2><p className="mt-0.5 text-xs text-zinc-500">New signups that added a business</p></div>
          <ActivationGauge {...data.activation} />
        </AdminCard>
        <AdminCard className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Top agents</h2><p className="mt-0.5 text-xs text-zinc-500">Commission leaders · {data.leaderboard.label}</p></div><Link href="/admin/agents" className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">View agents</Link></div>
          {data.leaderboard.rows.length ? <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.leaderboard.rows.map((row, index) => <li key={row.agentId} className="flex min-h-[56px] items-center gap-3 py-2.5">
              <span className="w-5 text-center text-xs font-semibold tabular-nums text-zinc-400">{index + 1}</span>
              {row.avatar ? <Image src={row.avatar} alt="" aria-hidden width={32} height={32} unoptimized className="h-8 w-8 rounded-full object-cover" /> : <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">{row.name.slice(0, 1).toUpperCase()}</span>}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
              <AgentSparkline values={row.series} />
              {row.rankChange != null ? <span className={`w-9 text-right text-[10px] font-semibold ${row.rankChange > 0 ? "text-emerald-600" : row.rankChange < 0 ? "text-rose-600" : "text-zinc-400"}`}>{row.rankChange > 0 ? `↑${row.rankChange}` : row.rankChange < 0 ? `↓${Math.abs(row.rankChange)}` : "—"}</span> : <span className="w-9 text-right text-[10px] text-emerald-600">NEW</span>}
              <span className="w-24 text-right text-sm font-semibold tabular-nums">{formatINR(row.amountPaise)}</span>
            </li>)}
          </ol> : <AdminEmptyState title="No agent commissions yet" description="Agent commissions will appear here after a business sale." action={<Link href="/admin/agents" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">Open agents</Link>} />}
        </AdminCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <AdminCard className="p-4 sm:p-5">
          <div className="mb-4"><h2 className="text-sm font-semibold">Recent activity</h2><p className="mt-0.5 text-xs text-zinc-500">Latest changes across your admin team</p></div>
          {activity.ok ? <Timeline items={activity.data.items.map((row) => ({ id: row.id, action: row.action, createdAt: row.createdAt, reason: row.reason }))} /> : <AdminEmptyState title="Activity is unavailable" description="Try again in a moment." />}
        </AdminCard>
        <AdminCard className="p-4 sm:p-5">
          <div className="mb-4"><h2 className="text-sm font-semibold">System health</h2><p className="mt-0.5 text-xs text-zinc-500">Live checks for platform services</p></div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3"><dt className="text-zinc-500">WhatsApp sender</dt><dd className="font-medium capitalize">{data.health.whatsapp}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-zinc-500">Last payment</dt><dd className="text-right text-xs">{data.health.lastPaymentAt ? new Date(data.health.lastPaymentAt).toLocaleString("en-IN") : "—"}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-zinc-500">Last reconciliation</dt><dd className="text-right text-xs">{data.health.lastReconcileAt ? new Date(data.health.lastReconcileAt).toLocaleString("en-IN") : "—"}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-zinc-500">Job error rate</dt><dd className="tabular-nums">{(data.health.errorRate * 100).toFixed(1)}%</dd></div>
          </dl>
        </AdminCard>
      </div>
    </div>
  );
}
