import { addIstDays, istDayKey, istDayStart, istParts, istWeekdayIndex } from "../analytics/ist";

/** Monday of the IST week that contains `now`. Sunday belongs to the Monday just past. */
export function mondayKey(now: Date) {
  const today = istDayKey(now);
  const index = istWeekdayIndex(today);
  const back = index === 0 ? 6 : index - 1;
  return addIstDays(today, -back);
}

export function clockOnDay(dayKey: string, hour: number, minute: number) {
  const safeHour = Math.min(23, Math.max(0, Math.floor(hour)));
  const safeMinute = Math.min(59, Math.max(0, Math.floor(minute)));
  return new Date(istDayStart(dayKey).getTime() + (safeHour * 60 + safeMinute) * 60 * 1000);
}

/** The Monday date key once that week's send time has arrived. Null before then. */
export function weeklyDue(now: Date, hour = 9, minute = 0) {
  const monday = mondayKey(now);
  if (now.getTime() < clockOnDay(monday, hour, minute).getTime()) return null;
  return monday;
}

/** `YYYY-MM` once 09:00 IST on the 1st has passed. */
export function monthlyDue(now: Date, hour = 9, minute = 0) {
  const parts = istParts(now);
  const key = `${parts.year}-${String(parts.month).padStart(2, "0")}`;
  const first = `${key}-01`;
  if (now.getTime() < clockOnDay(first, hour, minute).getTime()) return null;
  return key;
}

export type ReportChannelPref = {
  emailOptIn: boolean;
  whatsappOptIn: boolean;
  unsubscribedAt: Date | null;
} | null;

/** Missing row: email on, WhatsApp off. Unsubscribe turns both off. */
export function wantsReport(pref: ReportChannelPref, channel: "email" | "whatsapp") {
  if (pref?.unsubscribedAt) return false;
  if (!pref) return channel === "email";
  return channel === "email" ? pref.emailOptIn : pref.whatsappOptIn;
}

/** Spread recipients so at most `maxPerMinute` leave in the same minute. */
export function sendSlots<T>(items: T[], maxPerMinute: number, start: Date) {
  const pace = Math.max(1, Math.floor(maxPerMinute) || 1);
  return items.map((item, index) => ({
    item,
    runAt: new Date(start.getTime() + Math.floor(index / pace) * 60 * 1000)
  }));
}
