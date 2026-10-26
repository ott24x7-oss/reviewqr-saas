"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { AdminTabs, AdminButton } from "./controls";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "mtd", label: "MTD" },
  { value: "qtd", label: "QTD" },
  { value: "ytd", label: "YTD" }
] as const;

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month: month - 1, day };
}

function dateString(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthIndex(value: string) {
  const { year, month } = dateParts(value);
  return year * 12 + month;
}

function monthFromIndex(index: number) {
  const year = Math.floor(index / 12);
  const month = index % 12;
  return { year, month };
}

function formatDate(value: string | null) {
  if (!value) return "Choose a range";
  const { year, month, day } = dateParts(value);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, day)));
}

function todayString() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "01";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function MonthGrid({
  index,
  from,
  to,
  today,
  onPick
}: {
  index: number;
  from: string | null;
  to: string | null;
  today: string;
  onPick: (value: string) => void;
}) {
  const { year, month } = monthFromIndex(index);
  const firstDay = new Date(Date.UTC(year, month, 1));
  const offset = (firstDay.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const days = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, day) => day + 1)];
  while (days.length < 35) days.push(null);
  const title = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(firstDay);
  return (
    <div className="w-[238px]">
      <h3 className="mb-3 text-center text-sm font-semibold">{title}</h3>
      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-zinc-400">{"MTWTFSS".split("").map((day, i) => <span key={`${day}${i}`} className="py-1">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, position) => {
          if (!day) return <span key={`blank-${position}`} />;
          const value = dateString(year, month, day);
          const selected = value === from || value === to;
          const between = Boolean(from && to && value > from && value < to);
          const disabled = value > today;
          return <button key={value} type="button" disabled={disabled} aria-label={`Select ${value}`} aria-pressed={selected} onClick={() => onPick(value)} className={cn("mx-auto grid h-8 w-8 place-items-center rounded-full text-xs transition-colors", selected && "bg-emerald-700 font-semibold text-white dark:bg-emerald-400 dark:text-zinc-950", between && !selected && "rounded-none bg-emerald-50 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200", !selected && !between && !disabled && "hover:bg-zinc-100 dark:hover:bg-zinc-800", disabled && "cursor-not-allowed text-zinc-300 dark:text-zinc-700")}>{day}</button>;
        })}
      </div>
    </div>
  );
}

export function AdminDateRange({ range, from, to, compare }: { range: string; from: string | null; to: string | null; compare: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [draftFrom, setDraftFrom] = React.useState(from);
  const [draftTo, setDraftTo] = React.useState(to);
  const [leftMonth, setLeftMonth] = React.useState(() => monthIndex(from || todayString()) - (from ? 0 : 1));
  const today = todayString();
  const activeRange = PRESETS.some((item) => item.value === range) ? range : "";

  function navigate(values: Record<string, string | null>) {
    const params = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function pick(value: string) {
    if (!draftFrom || draftTo) {
      setDraftFrom(value);
      setDraftTo(null);
      return;
    }
    if (value < draftFrom) {
      setDraftFrom(value);
      setDraftTo(null);
      return;
    }
    setDraftTo(value);
  }

  function openPicker() {
    setDraftFrom(from);
    setDraftTo(to);
    setLeftMonth(monthIndex(from || today) - 1);
    setOpen((current) => !current);
  }

  const summary = from && to ? `${formatDate(from)} – ${formatDate(to)}` : range === "custom" && from ? formatDate(from) : "Custom range";

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <AdminTabs value={activeRange} items={PRESETS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => navigate({ range: value, from: null, to: null })} label="Dashboard date range" />
      <div className="relative">
        <button type="button" aria-expanded={open} aria-haspopup="dialog" onClick={openPicker} className={cn("admin-button inline-flex h-10 items-center gap-2 rounded-[11px] border border-zinc-200 bg-white/70 px-3 text-xs font-medium text-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-200", range === "custom" && "border-emerald-500 text-emerald-800 dark:text-emerald-200")}>
          <CalendarDays className="h-4 w-4" /> <span className="max-w-[160px] truncate">{summary}</span>
        </button>
        {open ? <div className="absolute right-0 z-40 mt-2 w-[min(558px,calc(100vw-1.5rem))] rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-950" role="dialog" aria-label="Choose custom date range">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold">Custom range</h2><p className="mt-0.5 text-xs text-zinc-500">Choose a start and end date</p></div>
            <div className="flex gap-1">
              <button type="button" className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-700" aria-label="Previous two months" onClick={() => setLeftMonth((value) => value - 1)}><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 dark:border-zinc-700" aria-label="Next two months" onClick={() => setLeftMonth((value) => Math.min(value + 1, monthIndex(today) - 1))}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-5">
            <MonthGrid index={leftMonth} from={draftFrom} to={draftTo} today={today} onPick={pick} />
            <MonthGrid index={leftMonth + 1} from={draftFrom} to={draftTo} today={today} onPick={pick} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <span className="text-xs text-zinc-500">{draftFrom ? formatDate(draftFrom) : "Start date"} <span className="px-1">→</span> {draftTo ? formatDate(draftTo) : "End date"}</span>
            <div className="flex gap-2"><AdminButton variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</AdminButton><AdminButton size="sm" disabled={!draftFrom || !draftTo} onClick={() => { navigate({ range: "custom", from: draftFrom, to: draftTo }); setOpen(false); }}>Apply range</AdminButton></div>
          </div>
        </div> : null}
      </div>
      <button type="button" role="switch" aria-checked={compare} onClick={() => navigate({ compare: compare ? "0" : null })} className="inline-flex min-h-10 items-center gap-2 rounded-[11px] px-2 text-xs font-medium text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-zinc-900/60">
        <span className={cn("relative h-5 w-9 rounded-full transition-colors", compare ? "bg-emerald-600 dark:bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-700")}><i className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-950", compare ? "translate-x-[18px]" : "translate-x-0.5")} /></span>
        Compare to previous
      </button>
    </div>
  );
}
