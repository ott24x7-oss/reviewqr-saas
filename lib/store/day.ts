export type DaySummary = { count: number; totalPaise: number };

const IST = "Asia/Kolkata";

/** Midnight-to-midnight window in Asia/Kolkata. India has no daylight-saving shift. */
export function kolkataDayWindow(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const start = new Date(`${day}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { day, start, end };
}
