import { indiaDayStart, indiaMonthStart } from "@/lib/plans/india";

const DAY = 24 * 60 * 60 * 1000;

export type AdminWindow = {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  label: string;
};

function dayStamp(year: number, month: number, day: number) {
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:30`);
}

export function dayKey(on: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(on);
}

export function indiaDate(value: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = dayStamp(year, month, day);
  return Number.isNaN(date.getTime()) || dayKey(date) !== value ? null : date;
}

export function adminWindow(search: URLSearchParams, now = new Date()): { ok: true; window: AdminWindow } | { ok: false; error: string } {
  const range = search.get("range") || "7d";
  const today = indiaDayStart(now);
  let start = today;
  let end = new Date(today.getTime() + DAY);
  if (range === "today") {
    start = today;
  } else if (range === "7d") {
    start = new Date(end.getTime() - 7 * DAY);
  } else if (range === "30d") {
    start = new Date(end.getTime() - 30 * DAY);
  } else if (range === "mtd") {
    start = indiaMonthStart(now);
  } else if (range === "qtd" || range === "ytd") {
    const todayKey = dayKey(now);
    const [year, month] = todayKey.split("-").map(Number);
    start = range === "ytd" ? dayStamp(year, 1, 1) : dayStamp(year, Math.floor((month - 1) / 3) * 3 + 1, 1);
  } else if (range === "custom") {
    const from = indiaDate(search.get("from"));
    const to = indiaDate(search.get("to"));
    if (!from || !to) return { ok: false, error: "Use from and to as YYYY-MM-DD" };
    start = from;
    end = new Date(to.getTime() + DAY);
    if (end.getTime() <= start.getTime()) return { ok: false, error: "The end date is before the start" };
    if (end.getTime() - start.getTime() > 366 * DAY) return { ok: false, error: "Pick a range of a year or less" };
  } else {
    return { ok: false, error: "range must be today, 7d, 30d, mtd, qtd, ytd, or custom" };
  }
  const length = Math.max(DAY, end.getTime() - start.getTime());
  const label = range === "custom" ? `${search.get("from")} – ${search.get("to")}` : range;
  return { ok: true, window: { start, end, prevStart: new Date(start.getTime() - length), prevEnd: start, label } };
}

export function eachDay(start: Date, end: Date) {
  const days: string[] = [];
  for (let cursor = start.getTime(); cursor < end.getTime() && days.length < 370; cursor += DAY) {
    const key = dayKey(new Date(cursor));
    if (days[days.length - 1] !== key) days.push(key);
  }
  return days;
}
