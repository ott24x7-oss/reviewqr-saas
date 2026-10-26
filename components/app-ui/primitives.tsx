"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, Check, ChevronDown, Lock, X } from "lucide-react";
import { animate, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAppLanguage } from "./i18n";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  data = [],
  format
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  data?: number[];
  format?: "inr";
}) {
  const points = data.map((amount, index) => ({ index, amount }));
  return (
    <section className="app-ui-panel min-w-0 p-4 sm:p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="min-w-0 truncate text-2xl font-semibold tabular-nums tracking-tight">
          {typeof value === "number" ? <CountUp value={value} format={format} /> : value}
        </p>
        {points.length > 1 ? (
          <div className="h-10 w-24 shrink-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <Tooltip content={() => null} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
      {delta ? <p className="mt-2 text-xs text-muted-foreground">{delta}</p> : null}
    </section>
  );
}

function formatKpiValue(value: number, format?: "inr") {
  return new Intl.NumberFormat("en-IN", format === "inr"
    ? { style: "currency", currency: "INR", maximumFractionDigits: 0 }
    : undefined).format(value);
}

function CountUp({ value, format }: { value: number; format?: "inr" }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (current) => Math.round(current));
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = React.useState(() => formatKpiValue(0, format));

  React.useEffect(() => {
    if (reducedMotion) {
      setShown(formatKpiValue(value, format));
      return;
    }
    const unsubscribe = rounded.on("change", (current) => {
      setShown(formatKpiValue(current, format));
    });
    const controls = animate(motionValue, value, { duration: 0.55, ease: "easeOut" });
    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [format, motionValue, reducedMotion, rounded, value]);

  return <span>{shown}</span>;
}

export function StatStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>{children}</div>;
}

export function StatusBadge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    danger: "bg-red-500/10 text-red-700 dark:text-red-400",
    info: "bg-blue-500/10 text-blue-700 dark:text-blue-400"
  };
  return <span className={cn("inline-flex min-h-6 items-center rounded-md px-2 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Money({
  value,
  compact = false,
  className
}: {
  value: number;
  compact?: boolean;
  className?: string;
}) {
  const { language } = useAppLanguage();
  const amount = Math.abs(value);
  const notation = compact && amount >= 10000000 ? "compact" : compact && amount >= 100000 ? "compact" : "standard";
  const formatted = new Intl.NumberFormat(language === "hi" ? "hi-IN" : "en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    notation,
    compactDisplay: "long"
  }).format(value);
  return <span className={cn("tabular-nums", className)}>{formatted}</span>;
}

export function RelativeTime({ date }: { date: string | Date }) {
  const { language } = useAppLanguage();
  const time = date instanceof Date ? date : new Date(date);
  const delta = Math.round((time.getTime() - Date.now()) / 1000);
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];
  const step = steps.find(([, seconds]) => Math.abs(delta) >= seconds);
  const relative = step
    ? new Intl.RelativeTimeFormat(language === "hi" ? "hi-IN" : "en-IN", { numeric: "auto" }).format(
        Math.round(delta / step[1]),
        step[0]
      )
    : language === "hi" ? "अभी" : "just now";
  return <time dateTime={time.toISOString()} title={time.toLocaleString(language === "hi" ? "hi-IN" : "en-IN")}>{relative}</time>;
}

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/35 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="app-ui-popover fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l bg-background outline-none data-[state=open]:animate-in data-[state=closed]:animate-out sm:duration-200">
          <header className="flex items-start justify-between gap-4 border-b p-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close className="app-ui-focus inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-muted" aria-label="Close details">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {footer ? <footer className="border-t bg-background p-4">{footer}</footer> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Timeline({ items }: { items: Array<{ title: React.ReactNode; detail?: React.ReactNode; date?: string | Date }> }) {
  return (
    <ol className="space-y-0">
      {items.map((item, index) => (
        <li className="relative flex gap-3 pb-5 last:pb-0" key={index}>
          <span className="relative mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border bg-card">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {index < items.length - 1 ? <span className="absolute top-4 h-full w-px bg-border" /> : null}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium">{item.title}</p>
              {item.date ? <span className="text-xs text-muted-foreground"><RelativeTime date={item.date} /></span> : null}
            </div>
            {item.detail ? <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export type SetupStep = {
  id: string;
  title: React.ReactNode;
  detail: React.ReactNode;
  href: string;
  done: boolean;
};

export function SetupStepper({
  steps,
  title,
  completeLabel
}: {
  steps: SetupStep[];
  title: React.ReactNode;
  completeLabel: React.ReactNode;
}) {
  const { text } = useAppLanguage();
  const firstOpen = steps.find((step) => !step.done)?.id || steps[0]?.id || "";
  const [openId, setOpenId] = React.useState(firstOpen);
  const completed = steps.filter((step) => step.done).length;
  return (
    <section className="app-ui-panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">{completed} / {steps.length} {completeLabel}</span>
      </header>
      <div className="grid md:grid-cols-[minmax(220px,0.85fr)_minmax(0,1.3fr)]">
        <ol className="divide-y border-b md:border-b-0 md:border-r">
          {steps.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                className={cn("app-ui-focus flex min-h-14 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-muted/60 sm:px-5", openId === step.id && "bg-muted/60")}
                aria-expanded={openId === step.id}
                onClick={() => setOpenId(step.id)}
              >
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium", step.done ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}>
                  {step.done ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", step.done && "text-muted-foreground")}>{step.title}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", openId === step.id && "rotate-180")} />
              </button>
            </li>
          ))}
        </ol>
        <div className="flex min-h-48 flex-col justify-between gap-5 p-4 sm:p-6">
          {steps.map((step) => step.id === openId ? (
            <div key={step.id}>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{step.detail}</p>
            </div>
          ) : null)}
          {steps.find((step) => step.id === openId) ? (
            <Link
              href={steps.find((step) => step.id === openId)!.href}
              className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              {text("Start", "शुरू करें")} <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ProgressRing({
  value,
  label,
  sublabel,
  size = 112
}: {
  value: number;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  size?: number;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={String(label) + ": " + clamped + "%"}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamped / 100)} />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-lg font-semibold tabular-nums">{clamped}%</div>
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        {sublabel ? <p className="mt-1 text-sm text-muted-foreground">{sublabel}</p> : null}
      </div>
    </div>
  );
}

export function PlanLockBadge({ href = "/dashboard/account/plan", label }: { href?: string; label?: React.ReactNode }) {
  const { text } = useAppLanguage();
  return (
    <Link href={href} className="inline-flex min-h-8 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium hover:bg-muted">
      <Lock className="h-3.5 w-3.5" />
      {label || text("View plans", "प्लान देखें")}
    </Link>
  );
}

export function PlanLockNotice({ title, body, href = "/dashboard/account/plan" }: { title: React.ReactNode; body: React.ReactNode; href?: string }) {
  const { text } = useAppLanguage();
  return (
    <section className="app-ui-panel p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"><Lock className="h-4 w-4" /> {text("Included in higher plans", "ऊँचे प्लान में शामिल")}</div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
        <Link href={href} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          {text("View plans", "प्लान देखें")} <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export function FormSection({ title, description, children }: { title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-b py-6 last:border-b-0 md:grid-cols-[minmax(180px,0.65fr)_minmax(0,1.35fr)]">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

export function StickySaveBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("sticky bottom-0 z-20 -mx-4 mt-6 flex items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6", className)}>{children}</div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden="true" />;
}

export function EmptyState({ title, description, action, icon }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-4 py-10 text-center">
      {icon ? <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">{icon}</div> : null}
      <h3 className="font-medium">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function InlineError({ title, onRetry }: { title: React.ReactNode; onRetry?: () => void }) {
  const { text } = useAppLanguage();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
      <span>{title}</span>
      {onRetry ? <button type="button" className="app-ui-focus min-h-9 rounded-md border px-3 font-medium" onClick={onRetry}>{text("Retry", "फिर कोशिश करें")}</button> : null}
    </div>
  );
}

export function ToastViewport() {
  return null;
}
