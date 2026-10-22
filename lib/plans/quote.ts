import { addDays, addMonths } from "date-fns";
import type { PlanDuration } from "@prisma/client";
import { durationMonths } from "./catalog";

/** Unused portion of the price already paid. A lifetime plan credits the full price. */
export function prorateCredit(input: {
  pricePaidPaise: number;
  startsAt: Date;
  endsAt: Date | null;
  now?: Date;
}) {
  const paid = Math.max(0, Math.floor(input.pricePaidPaise));
  if (paid === 0) return 0;
  if (!input.endsAt) return paid;
  const now = input.now ?? new Date();
  const start = input.startsAt.getTime();
  const end = input.endsAt.getTime();
  const at = now.getTime();
  if (at >= end) return 0;
  if (at <= start || end <= start) return paid;
  return Math.round((paid * (end - at)) / (end - start));
}

export type PlanQuote =
  | { kind: "renew"; duePaise: number; creditPaise: 0 }
  | { kind: "upgrade"; duePaise: number; creditPaise: number }
  | { kind: "downgrade"; duePaise: 0; creditPaise: 0 };

/**
 * Same plan renews at full price and extends the current end.
 * A cheaper different plan waits until the period ends.
 * Anything else is an upgrade: the unused value reduces what is due now.
 */
export function quotePlanChange(input: {
  samePlan: boolean;
  currentPricePaise: number;
  targetPricePaise: number;
  creditPaise: number;
}): PlanQuote {
  const target = Math.max(0, Math.floor(input.targetPricePaise));
  const current = Math.max(0, Math.floor(input.currentPricePaise));
  if (input.samePlan) return { kind: "renew", duePaise: target, creditPaise: 0 };
  if (target < current) return { kind: "downgrade", duePaise: 0, creditPaise: 0 };
  const credit = Math.min(Math.max(0, Math.floor(input.creditPaise)), target);
  return { kind: "upgrade", duePaise: target - credit, creditPaise: credit };
}

export function periodEnd(input: {
  duration: PlanDuration;
  currentEnd: Date | null;
  now?: Date;
  extend: boolean;
}) {
  const months = durationMonths(input.duration);
  if (months == null) return null;
  const now = input.now ?? new Date();
  const base = input.extend && input.currentEnd && input.currentEnd.getTime() > now.getTime() ? input.currentEnd : now;
  return addMonths(base, months);
}

export function extendByReward(endsAt: Date | null, months: number, days: number) {
  if (!endsAt) return null;
  let next = endsAt;
  const wholeMonths = Math.max(0, Math.floor(months));
  const wholeDays = Math.max(0, Math.floor(days));
  if (wholeMonths) next = addMonths(next, wholeMonths);
  if (wholeDays) next = addDays(next, wholeDays);
  return next;
}
