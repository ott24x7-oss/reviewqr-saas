export const WEEK_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export type DayHours = { open: string; close: string } | null;
export type WeekHours = Partial<Record<WeekDay, DayHours>>;

const IST = "Asia/Kolkata";

function minutes(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function kolkataClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const weekday = get("weekday").slice(0, 3).toLowerCase() as WeekDay;
  return {
    day: weekday,
    minutes: Number(get("hour")) * 60 + Number(get("minute"))
  };
}

function previousDay(day: WeekDay): WeekDay {
  return WEEK_DAYS[(WEEK_DAYS.indexOf(day) + 6) % 7];
}

function covers(row: DayHours | undefined, nowMinutes: number, yesterdaySpill: boolean) {
  if (!row) return false;
  const open = minutes(row.open);
  const close = minutes(row.close);
  if (open == null || close == null || open === close) return false;
  if (close > open) return yesterdaySpill ? false : nowMinutes >= open && nowMinutes < close;
  return yesterdaySpill ? nowMinutes < close : nowMinutes >= open;
}

/**
 * True when the business is open, false when closed, null when no hours are set.
 * A missing day is closed. An overnight range (22:00–02:00) stays open after midnight.
 */
/** True during a same-day or overnight HH:MM window in India. An empty or equal range stays visible. */
export function inClockWindow(from: string, to: string, now = new Date()) {
  const start = minutes(from);
  const end = minutes(to);
  if (start == null || end == null || start === end) return true;
  const nowMinutes = kolkataClock(now).minutes;
  if (end > start) return nowMinutes >= start && nowMinutes < end;
  return nowMinutes >= start || nowMinutes < end;
}

export function isOpenAt(hours: WeekHours | null | undefined, now = new Date()): boolean | null {
  if (!hours || Object.keys(hours).length === 0) return null;
  const clock = kolkataClock(now);
  if (covers(hours[clock.day], clock.minutes, false)) return true;
  if (covers(hours[previousDay(clock.day)], clock.minutes, true)) return true;
  return false;
}
