"use client";

import * as React from "react";
import { motion } from "framer-motion";
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
  return <span className={`admin-badge ${tone}`}><span className="admin-badge__dot" aria-hidden />{value}</span>;
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
  const reduce = useMotionSafe();
  if (reduce) return <div className={`admin-skeleton rounded-md bg-zinc-200/80 dark:bg-zinc-800 ${className}`} />;
  return <motion.div className={`admin-skeleton rounded-md bg-zinc-200/80 dark:bg-zinc-800 ${className}`} animate={{ backgroundPositionX: ["0%", "220%"] }} transition={{ duration: 1.35, ease: "linear", repeat: Infinity }} />;
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
  series,
  icon,
  hero = false
}: {
  label: string;
  value: string;
  delta?: number | null;
  series?: number[];
  icon?: React.ReactNode;
  hero?: boolean;
}) {
  const reduce = useMotionSafe();
  const gradientId = `kpi-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const data = (series || []).map((point, index) => ({ index, point }));
  const up = (delta || 0) >= 0;
  return (
    <article className={`admin-card admin-kpi-card ${hero ? "admin-kpi-card--hero" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold tracking-wide text-zinc-500">{label}</div>
        {icon ? <div className="admin-kpi-icon">{icon}</div> : null}
      </div>
      <div className="mt-1 text-[26px] font-semibold tabular-nums tracking-tight text-zinc-950 dark:text-zinc-50">
        <CountUp value={value} reduce={reduce} />
      </div>
      {delta != null ? (
        <div className="mt-1">
          <span className="admin-kpi-delta" data-trend={up ? "up" : "down"}>
            {up ? "↑" : "↓"} {Math.abs(Math.round(delta))}%
          </span>
          <span className="ml-1.5 text-[11px] text-zinc-500">vs previous</span>
        </div>
      ) : (
        <div className="mt-1 min-h-[21px] text-[11px] text-zinc-400">{data.length > 1 && data.every((point) => point.point === 0) ? "No activity yet" : " "}</div>
      )}
      <div className="admin-kpi-spark">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--admin-brand)" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="var(--admin-brand)" stopOpacity={0.015} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="point"
                stroke="var(--admin-brand)"
                fill={`url(#${gradientId})`}
                strokeWidth={1.8}
                dot={false}
                activeDot={false}
                isAnimationActive={!reduce}
                animationDuration={700}
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
      const progress = Math.min(1, (now - started) / 700);
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

export function StatStrip({ items }: { items: { label: string; value: string; delta?: number | null }[] }) {
  return (
    <div className="admin-stat-strip grid gap-px sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <div className="text-xs text-zinc-500">{item.label}</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><div className="text-lg font-semibold tabular-nums">{item.value}</div>{item.delta != null ? <span className={`text-[10px] font-semibold ${item.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{item.delta >= 0 ? "↑" : "↓"} {Math.abs(item.delta)}%</span> : null}</div>
        </div>
      ))}
    </div>
  );
}
