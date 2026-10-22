/** India has no daylight saving. Calendar days are Asia/Kolkata. */

const IST = "Asia/Kolkata";

export function istParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday").slice(0, 3).toLowerCase()
  };
}

export function istDayKey(date: Date) {
  const parts = istParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/** Midnight at the start of an IST calendar day, as a UTC instant. */
export function istDayStart(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
}

export function istDayRange(key: string) {
  const start = istDayStart(key);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function istHour(date: Date) {
  return istParts(date).hour;
}

export function addIstDays(key: string, days: number) {
  const start = istDayStart(key);
  return istDayKey(new Date(start.getTime() + days * 24 * 60 * 60 * 1000));
}

export function istDaysEnding(endKey: string, count: number) {
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) days.push(addIstDays(endKey, -offset));
  return days;
}

const WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function istWeekdayIndex(key: string) {
  const name = istParts(istDayStart(key)).weekday;
  const index = WEEK.indexOf(name);
  return index < 0 ? 0 : index;
}
