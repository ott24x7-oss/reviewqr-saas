import Link from "next/link";
import { FunnelBars, MixDonut, RevenueChart } from "@/components/admin/ui/charts";
import { Timeline } from "@/components/admin/ui/detail";
import { KpiCard, PageHeader, StatStrip } from "@/components/admin/ui/primitives";
import { listAdminAudit } from "@/lib/admin/audit-query";
import { loadAdminDashboard } from "@/lib/admin/dashboard";
import { adminSearchParams } from "@/lib/admin/web-search";
import { formatINR, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "mtd", label: "Month" }
];

function percent(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export default async function AdminHome({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const search = adminSearchParams(searchParams);
  if (!search.get("range")) search.set("range", "7d");
  const [dash, activity] = await Promise.all([loadAdminDashboard(search), listAdminAudit(new URLSearchParams("limit=8"))]);
  if (!dash.ok) return <p className="text-sm text-rose-600">{dash.error}</p>;
  const data = dash.data;
  const kpis = data.kpis;
  const range = search.get("range") || "7d";
  return (
    <div>
      <PageHeader
        title="Home"
        subtitle="Revenue, subscriptions, and what needs a look."
        actions={
          <div className="flex gap-1 rounded-full border border-zinc-200 p-1 dark:border-zinc-700">
            {RANGES.map((item) => (
              <Link
                key={item.id}
                href={`/admin?range=${item.id}`}
                className={`rounded-full px-3 py-1 text-sm ${range === item.id ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "text-zinc-500"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue" value={formatINR(kpis.revenuePaise)} delta={percent(kpis.revenuePaise, kpis.previousRevenuePaise)} series={data.series.revenue} />
        <KpiCard label="New paid" value={formatNumber(kpis.newPaid)} series={data.series.newPaid} />
        <KpiCard label="MRR" value={formatINR(kpis.mrrPaise)} />
        <KpiCard label="Active subs" value={formatNumber(kpis.activeSubs)} />
        <KpiCard label="Trials" value={formatNumber(kpis.trials)} />
        <KpiCard label="Expiring 7d" value={formatNumber(kpis.expiring)} />
        <KpiCard label="Churn" value={formatNumber(kpis.churned)} />
        <KpiCard label="Signups" value={formatNumber(kpis.signups)} delta={percent(kpis.signups, kpis.previousSignups)} series={data.series.signups} />
      </div>
      <div className="mt-4">
        <StatStrip
          items={[
            { label: "Scans", value: formatNumber(kpis.scans) },
            { label: "Shop orders", value: formatNumber(kpis.shopOrders) },
            { label: "ARR", value: formatINR(kpis.arrPaise) },
            { label: "Error rate", value: String(data.health.errorRate) }
          ]}
        />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-[14px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold">Revenue vs previous</h2>
          <RevenueChart days={data.series.days} revenue={data.series.revenue} previous={data.series.previousRevenue} />
        </section>
        <section className="rounded-[14px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold">Plan mix</h2>
          <MixDonut rows={data.planMix.map((row) => ({ name: row.name, count: row.count }))} />
        </section>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="rounded-[14px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold">Signup to paid</h2>
          <FunnelBars steps={[{ name: "Signups", value: kpis.signups }, { name: "Paid", value: kpis.newPaid }]} />
        </section>
        <section className="rounded-[14px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">Top agents</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {data.leaderboard.rows.length === 0 ? <li className="text-zinc-500">No commission this period.</li> : null}
            {data.leaderboard.rows.map((row, index) => (
              <li key={row.agentId} className="flex justify-between gap-3">
                <span>{index + 1}. {row.name}</span>
                <span className="tabular-nums">{formatINR(row.amountPaise)}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-[14px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">System</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-zinc-500">WhatsApp</dt><dd>{data.health.whatsapp}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-zinc-500">Last payment</dt><dd>{data.health.lastPaymentAt ? new Date(data.health.lastPaymentAt).toLocaleString("en-IN") : "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-zinc-500">Last reconcile</dt><dd>{data.health.lastReconcileAt ? new Date(data.health.lastReconcileAt).toLocaleString("en-IN") : "—"}</dd></div>
          </dl>
        </section>
      </div>
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
        {activity.ok ? <Timeline items={activity.data.items.map((row) => ({ id: row.id, action: row.action, createdAt: row.createdAt, reason: row.reason }))} /> : <p className="text-sm text-zinc-500">Activity is unavailable.</p>}
      </section>
    </div>
  );
}
