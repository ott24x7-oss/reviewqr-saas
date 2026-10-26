function parts(on: Date) {
  const list = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(on);
  const read = (type: string) => Number(list.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function stamp(year: number, month: number, day: number) {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return new Date(`${year}-${m}-${d}T00:00:00+05:30`);
}

export function indiaDayStart(on = new Date()) {
  const { year, month, day } = parts(on);
  return stamp(year, month, day);
}

export function indiaMonthStart(on = new Date()) {
  const { year, month } = parts(on);
  return stamp(year, month, 1);
}

/** `2026-10` in Asia/Kolkata. An invalid value falls back to the current month. */
export function indiaMonthRange(month: string | null | undefined, on = new Date()) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || "");
  const year = match ? Number(match[1]) : parts(on).year;
  const mon = match ? Number(match[2]) : parts(on).month;
  if (!match || mon < 1 || mon > 12) {
    const current = parts(on);
    const start = stamp(current.year, current.month, 1);
    const next = current.month === 12 ? stamp(current.year + 1, 1, 1) : stamp(current.year, current.month + 1, 1);
    return { start, end: next, label: `${current.year}-${String(current.month).padStart(2, "0")}` };
  }
  const start = stamp(year, mon, 1);
  const end = mon === 12 ? stamp(year + 1, 1, 1) : stamp(year, mon + 1, 1);
  return { start, end, label: `${year}-${String(mon).padStart(2, "0")}` };
}
