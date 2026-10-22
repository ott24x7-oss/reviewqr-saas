import { addIstDays, istDayKey } from "./ist";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function daysBetween(fromKey: string, toKey: string) {
  const from = Date.parse(`${fromKey}T00:00:00.000Z`);
  const to = Date.parse(`${toKey}T00:00:00.000Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 1;
  return Math.max(1, Math.round((to - from) / 86400000) + 1);
}

export type AnalyticsRange = {
  preset: "7d" | "30d" | "90d" | "custom";
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  days: number;
};

/** Inclusive IST days. The previous window is the same length, ending the day before `from`. */
export function resolveRange(input: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  now?: Date;
}): AnalyticsRange {
  const today = istDayKey(input.now ?? new Date());
  const asked = input.preset === "30d" || input.preset === "90d" || input.preset === "custom" ? input.preset : "7d";
  let from = addIstDays(today, asked === "90d" ? -89 : asked === "30d" ? -29 : -6);
  let to = today;
  if (asked === "custom") {
    if (input.from && DAY.test(input.from)) from = input.from;
    if (input.to && DAY.test(input.to)) to = input.to;
    if (from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
  }
  if (daysBetween(from, to) > 366) from = addIstDays(to, -365);
  const days = daysBetween(from, to);
  const previousTo = addIstDays(from, -1);
  const previousFrom = addIstDays(previousTo, -(days - 1));
  return { preset: asked, from, to, previousFrom, previousTo, days };
}
