"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR, formatNumber } from "@/lib/utils";
import { useMotionSafe } from "./motion";

type RevenueTooltipProps = {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; name?: string }>;
  label?: string;
  compare: boolean;
};

function RevenueTooltip({ active, payload, label, compare }: RevenueTooltipProps) {
  if (!active || !payload?.length) return null;
  const current = Number(payload.find((item) => item.dataKey === "revenue")?.value || 0);
  const previous = Number(payload.find((item) => item.dataKey === "previous")?.value || 0);
  return (
    <div className="admin-chart-tooltip">
      <div className="mb-2 text-[11px] font-medium text-zinc-500">{label}</div>
      <div className="flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-emerald-500" />Revenue</span><strong className="tabular-nums">{formatINR(current * 100)}</strong></div>
      {compare ? <div className="mt-1 flex items-center justify-between gap-4 text-xs text-zinc-500"><span>Previous period</span><span className="tabular-nums">{formatINR(previous * 100)}</span></div> : null}
    </div>
  );
}

export function RevenueChart({
  days,
  revenue,
  previous,
  compare = true
}: {
  days: string[];
  revenue: number[];
  previous: number[];
  compare?: boolean;
}) {
  const reduce = useMotionSafe();
  const gradientId = `revenue-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const data = days.map((day, index) => ({
    day: day.slice(5),
    revenue: Math.round((revenue[index] || 0) / 100),
    previous: Math.round((previous[index] || 0) / 100)
  }));
  return (
    <div className="h-64 w-full" aria-label="Revenue compared with previous period">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--admin-chart-1)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--admin-chart-1)" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid className="admin-chart-grid" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="var(--admin-muted)" minTickGap={24} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} stroke="var(--admin-muted)" tickFormatter={(value: number) => `₹${value >= 100000 ? `${Math.round(value / 100000)}L` : value >= 1000 ? `${Math.round(value / 1000)}k` : value}`} width={40} />
          <Tooltip content={<RevenueTooltip compare={compare} />} cursor={{ stroke: "var(--admin-brand)", strokeWidth: 1.4, strokeDasharray: "3 4" }} />
          {compare ? <Line type="monotone" dataKey="previous" stroke="var(--admin-chart-2)" strokeWidth={1.7} strokeDasharray="5 5" dot={false} activeDot={false} isAnimationActive={!reduce} animationDuration={800} /> : null}
          <Area type="monotone" dataKey="revenue" stroke="var(--admin-chart-1)" strokeWidth={2.2} fill={`url(#${gradientId})`} activeDot={{ r: 4, fill: "var(--admin-panel)", stroke: "var(--admin-brand)", strokeWidth: 2 }} isAnimationActive={!reduce} animationDuration={800} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type PlanMixRow = { planId: string | null; name: string; count: number; mrrPaise: number };

export function PlanMixBreakdown({ rows }: { rows: PlanMixRow[] }) {
  const colors = ["var(--admin-chart-1)", "var(--admin-chart-2)", "var(--admin-chart-3)", "var(--admin-chart-4)", "var(--admin-chart-5)", "var(--admin-chart-6)"];
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const populated = rows.map((row, index) => ({ ...row, percent: total ? (row.count / total) * 100 : 0, color: colors[index % colors.length] }));
  return (
    <div className="space-y-4">
      {total ? <div className="flex h-4 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" aria-label={`${total} subscriptions across ${rows.length} plans`}>
        {populated.map((row) => <div key={row.planId || row.name} title={`${row.name}: ${row.percent.toFixed(1)}%`} style={{ width: `${row.percent}%`, background: row.color }} />)}
      </div> : <div className="grid h-16 place-items-center rounded-xl bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-900">No active subscriptions yet</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wide text-zinc-500"><tr><th className="pb-2 font-semibold">Plan</th><th className="pb-2 text-right font-semibold">Count</th><th className="pb-2 text-right font-semibold">Share</th><th className="pb-2 text-right font-semibold">MRR</th></tr></thead>
          <tbody>{populated.map((row) => <tr key={row.planId || row.name} className="border-t border-zinc-100 dark:border-zinc-800"><td className="py-2.5"><span className="mr-2 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: row.color }} /><span className="font-medium">{row.name}</span></td><td className="py-2.5 text-right tabular-nums">{formatNumber(row.count)}</td><td className="py-2.5 text-right tabular-nums">{row.percent.toFixed(1)}%</td><td className="py-2.5 text-right tabular-nums">{formatINR(row.mrrPaise)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export function FunnelBars({ steps }: { steps: { name: string; value: number }[] }) {
  const reduce = useMotionSafe();
  const max = Math.max(1, ...steps.map((step) => step.value));
  return (
    <div className="space-y-4 py-1">
      {steps.map((step, index) => {
        const width = `${Math.max(step.value ? 4 : 0, (step.value / max) * 100)}%`;
        return <div key={step.name}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-medium">{step.name}</span><span className="tabular-nums text-zinc-500">{formatNumber(step.value)}{index > 0 && max ? <span className="ml-1.5">· {Math.round((step.value / max) * 100)}%</span> : null}</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400" initial={reduce ? false : { width: 0 }} animate={{ width }} transition={{ duration: reduce ? 0 : 0.8, ease: [0.2, 0.8, 0.2, 1] }} /></div>
        </div>;
      })}
    </div>
  );
}

export function RevenueWaterfall({ newPaise, renewalPaise, refundPaise, netPaise }: { newPaise: number; renewalPaise: number; refundPaise: number; netPaise: number }) {
  const reduce = useMotionSafe();
  const gross = newPaise + renewalPaise;
  const max = Math.max(gross, 1);
  const h = 144;
  const y = (value: number) => h - Math.max(0, Math.min(max, value)) / max * h;
  const bars = [
    { name: "New", value: newPaise, start: 0, end: newPaise, color: "var(--admin-chart-1)", total: false },
    { name: "Renewals", value: renewalPaise, start: newPaise, end: gross, color: "var(--admin-chart-2)", total: false },
    { name: "Refunds", value: refundPaise, start: gross, end: Math.max(0, gross - refundPaise), color: "var(--admin-chart-5)", total: false },
    { name: "Net", value: netPaise, start: 0, end: netPaise, color: "var(--admin-chart-3)", total: true }
  ];
  if (!gross && !refundPaise) return <div className="grid h-48 place-items-center text-sm text-zinc-500">No revenue movement in this period</div>;
  return (
    <div className="w-full">
      <svg viewBox="0 0 420 188" role="img" aria-label="Revenue waterfall showing new payments, renewals, refunds, and net" className="h-48 w-full overflow-visible">
        {[0, 1, 2, 3].map((line) => <g key={line}><line x1="42" x2="410" y1={16 + line * 42} y2={16 + line * 42} stroke="var(--admin-border)" strokeDasharray="2 5" /><text x="0" y={20 + line * 42} fill="var(--admin-muted)" fontSize="9">{formatINR(Math.round(max * (3 - line) / 3))}</text></g>)}
        {bars.map((bar, index) => {
          const x = 76 + index * 88;
          const top = y(bar.end);
          const bottom = y(bar.start);
          const height = Math.max(2, bottom - top);
          return <g key={bar.name}>
            {!bar.total && index < 2 ? <line x1={x + 32} x2={x + 88} y1={bottom} y2={bottom} stroke="var(--admin-muted)" strokeOpacity=".4" strokeDasharray="3 3" /> : null}
            <motion.rect x={x} y={top} width="34" height={height} rx="6" fill={bar.color} opacity=".9" initial={reduce ? false : { height: 0, y: bottom }} animate={{ height, y: top }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : index * 0.045 }} />
            <text x={x + 17} y="178" textAnchor="middle" fill="var(--admin-muted)" fontSize="10">{bar.name}</text>
            <text x={x + 17} y={Math.max(11, top - 5)} textAnchor="middle" fill="var(--admin-ink)" fontSize="9" fontWeight="600">{formatINR(bar.value)}</text>
          </g>;
        })}
      </svg>
    </div>
  );
}

export function ActivationGauge({ rate, activated, total }: { rate: number; activated: number; total: number }) {
  const reduce = useMotionSafe();
  const bounded = Math.max(0, Math.min(100, rate));
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - bounded / 100);
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 144 144" className="h-full w-full -rotate-90" role="img" aria-label={`${bounded}% activation`}>
          <circle cx="72" cy="72" r={radius} fill="none" stroke="var(--admin-border)" strokeWidth="11" />
          <motion.circle cx="72" cy="72" r={radius} fill="none" stroke="url(#activation-gradient)" strokeWidth="11" strokeLinecap="round" strokeDasharray={circumference} initial={reduce ? false : { strokeDashoffset: circumference }} animate={{ strokeDashoffset: dashOffset }} transition={{ duration: reduce ? 0 : 0.8 }} />
          <defs><linearGradient id="activation-gradient"><stop stopColor="var(--admin-chart-1)" /><stop offset="1" stopColor="var(--admin-chart-2)" /></linearGradient></defs>
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center"><strong className="text-3xl font-semibold tabular-nums">{bounded}%</strong><span className="text-[10px] text-zinc-500">activated</span></div>
      </div>
      <div><div className="text-sm font-semibold">Accounts with a business</div><p className="mt-1 text-xs text-zinc-500">{formatNumber(activated)} of {formatNumber(total)} new accounts created one.</p><div className="mt-3 h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${bounded}%` }} /></div></div>
    </div>
  );
}

export function AgentSparkline({ values }: { values: number[] }) {
  const reduce = useMotionSafe();
  const data = values.map((value, index) => ({ index, value }));
  if (!data.length) return <span className="text-xs text-zinc-400">—</span>;
  return <div className="h-8 w-20"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><Line type="monotone" dataKey="value" stroke="var(--admin-chart-2)" strokeWidth={1.8} dot={false} isAnimationActive={!reduce} animationDuration={650} /></LineChart></ResponsiveContainer></div>;
}
