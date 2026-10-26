"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { formatDate, formatINR } from "@/lib/utils";
import { useMotionSafe } from "./motion";

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const BADGE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300",
  TRIALING: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/15 dark:text-sky-300",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-200",
  QUEUED: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-200",
  APPROVED: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/15 dark:text-sky-300",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/15 dark:text-rose-300",
  REVOKED: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/15 dark:text-rose-300",
  CANCELED: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
  EXPIRED: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
  PAUSED: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
  REFUNDED: "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/15 dark:text-violet-300"
};

export function StatusBadge({ value }: { value: string }) {
  const tone = BADGE[value] || "bg-zinc-100 text-zinc-700 ring-zinc-500/15 dark:bg-zinc-800 dark:text-zinc-200";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>{value}</span>;
}

export function Money({ paise, compact = false }: { paise: number; compact?: boolean }) {
  const rupees = paise / 100;
  let text = formatINR(paise);
  if (compact && Math.abs(rupees) >= 10_000_000) text = `₹${(rupees / 10_000_000).toFixed(2)} Cr`;
  else if (compact && Math.abs(rupees) >= 100_000) text = `₹${(rupees / 100_000).toFixed(2)} L`;
  return <span className="tabular-nums">{text}</span>;
}

export function RelativeTime({ value }: { value: string | Date | null }) {
  if (!value) return <span className="text-zinc-400">—</span>;
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const label =
    seconds < 60 ? "just now" : seconds < 3600 ? `${Math.floor(seconds / 60)}m ago` : seconds < 86400 ? `${Math.floor(seconds / 3600)}h ago` : `${Math.floor(seconds / 86400)}d ago`;
  return (
    <time dateTime={date.toISOString()} title={formatDate(date)} className="text-zinc-600 dark:text-zinc-300">
      {label}
    </time>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-800 ${className}`} />;
}

export function TableSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  series
}: {
  label: string;
  value: string;
  delta?: number | null;
  series?: number[];
}) {
  const reduce = useMotionSafe();
  const data = (series || []).map((point, index) => ({ index, point }));
  const up = (delta || 0) >= 0;
  return (
    <article className="rounded-[14px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-950 dark:text-zinc-50">
        <CountUp value={value} reduce={reduce} />
      </div>
      {delta != null ? (
        <div className={`mt-1 text-xs font-medium ${up ? "text-emerald-600" : "text-rose-600"}`}>
          {up ? "▲" : "▼"} {Math.abs(Math.round(delta))}% vs previous
        </div>
      ) : (
        <div className="mt-1 text-xs text-zinc-400"> </div>
      )}
      <div className="mt-3 h-12">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <Area
                type="monotone"
                dataKey="point"
                stroke="#16A34A"
                fill="#16A34A"
                fillOpacity={0.12}
                strokeWidth={1.5}
                isAnimationActive={!reduce}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </article>
  );
}

function CountUp({ value, reduce }: { value: string; reduce: boolean }) {
  const [shown, setShown] = React.useState(value);
  React.useEffect(() => {
    const match = value.match(/^(.*?)([\d,]+)(.*)$/);
    const target = match ? Number(match[2].replace(/,/g, "")) : Number.NaN;
    if (reduce || !match || !Number.isFinite(target)) {
      setShown(value);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 150);
      if (progress >= 1) {
        setShown(value);
        return;
      }
      const current = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      setShown(`${match[1]}${current.toLocaleString("en-IN")}${match[3]}`);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value, reduce]);
  return <>{shown}</>;
}

export function StatStrip({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-[14px] border border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white px-4 py-3 dark:bg-zinc-900">
          <div className="text-xs text-zinc-500">{item.label}</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
