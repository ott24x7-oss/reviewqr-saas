import { addDays, addMonths, differenceInCalendarDays } from "date-fns";
import type { PlanDuration } from "@prisma/client";
import { durationMonths } from "./catalog";

/**
 * Leftover value on an open same-plan period.
 * A finished or missing period carries nothing.
 */
export function carriedRenewalPaise(input: {
  now: Date;
  open: { pricePaise: number; startsAt: Date; endsAt: Date | null } | null;
}) {
  const open = input.open;
  if (!open?.endsAt || open.endsAt.getTime() <= input.now.getTime()) return 0;
  return prorateCredit({
    pricePaidPaise: open.pricePaise,
    startsAt: open.startsAt,
    endsAt: open.endsAt,
    now: input.now
  });
}

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
export function monthlyEquivalent(pricePaise: number, months: number) {
  const span = Math.max(1, Math.floor(months) || 1);
  return Math.round(Math.max(0, Math.floor(pricePaise)) / span);
}

export function quotePlanChange(input: {
  samePlan: boolean;
  currentPricePaise: number;
  targetPricePaise: number;
  creditPaise: number;
  currentMonths?: number;
  targetMonths?: number;
}): PlanQuote {
  const target = Math.max(0, Math.floor(input.targetPricePaise));
  const current = Math.max(0, Math.floor(input.currentPricePaise));
  if (input.samePlan) return { kind: "renew", duePaise: target, creditPaise: 0 };
  const targetMonthly = monthlyEquivalent(target, input.targetMonths ?? 1);
  const currentMonthly = monthlyEquivalent(current, input.currentMonths ?? 1);
  if (targetMonthly < currentMonthly) return { kind: "downgrade", duePaise: 0, creditPaise: 0 };
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

/** Snapshot price, else the catalogue price for that tier and duration, else the last real payment. */
export function creditBasePaise(input: {
  snapshotPaise: number;
  cataloguePaise: number;
  lastPaymentPaise: number;
}) {
  if (input.snapshotPaise > 0) return Math.floor(input.snapshotPaise);
  if (input.cataloguePaise > 0) return Math.floor(input.cataloguePaise);
  return Math.max(0, Math.floor(input.lastPaymentPaise));
}

/** Pick the catalogue duration closest to the stored period when the snapshot has none. */
export function inferDuration(startsAt: Date, endsAt: Date | null): PlanDuration {
  if (!endsAt) return "YEAR_1";
  const days = (endsAt.getTime() - startsAt.getTime()) / 86_400_000;
  if (days >= 300) return "YEAR_1";
  if (days >= 150) return "MONTH_6";
  return "MONTH_1";
}

/**
 * An upgrade starts today. Unused value becomes extra days on the new plan.
 * It is never added on top of the old end date.
 */
export function upgradeEndsAt(input: {
  now: Date;
  months: number;
  creditPaise: number;
  pricePaise: number;
}) {
  const months = Math.max(1, Math.floor(input.months) || 1);
  const base = addMonths(input.now, months);
  const price = Math.max(0, Math.floor(input.pricePaise));
  const credit = Math.max(0, Math.floor(input.creditPaise));
  if (price <= 0 || credit <= 0) return base;
  const periodDays = Math.max(1, differenceInCalendarDays(base, input.now));
  const extraDays = Math.round((credit / price) * periodDays);
  return addDays(base, extraDays);
}

/** Paid end is the stored end with the free suffix removed. */
export function paidEndsAt(endsAt: Date | null, bonusDays: number) {
  if (!endsAt) return null;
  const bonus = Math.max(0, Math.floor(bonusDays));
  if (!bonus) return endsAt;
  return addDays(endsAt, -bonus);
}

/** Free days still left on an open plan. Days already used are not carried. */
export function remainingBonusDays(input: { endsAt: Date | null; bonusDays: number; now: Date }) {
  const granted = Math.max(0, Math.floor(input.bonusDays));
  if (!input.endsAt || granted <= 0) return 0;
  if (input.now.getTime() >= input.endsAt.getTime()) return 0;
  const bonusStart = addDays(input.endsAt, -granted);
  if (input.now.getTime() <= bonusStart.getTime()) return granted;
  return Math.max(0, differenceInCalendarDays(input.endsAt, input.now));
}

/**
 * Referral credit lengthens the paid end. Carried free days stay after that.
 * The stored bonus is the whole free suffix.
 */
export function bonusCarry(input: {
  paidEndsAt: Date | null;
  carriedDays: number;
  rewardMonths: number;
  rewardDays: number;
}) {
  const carried = Math.max(0, Math.floor(input.carriedDays));
  const rewarded = extendByReward(input.paidEndsAt, input.rewardMonths, input.rewardDays);
  const rewardSpan =
    input.paidEndsAt && rewarded ? Math.max(0, differenceInCalendarDays(rewarded, input.paidEndsAt)) : 0;
  const endsAt = rewarded ? addDays(rewarded, carried) : null;
  return { endsAt, bonusDays: carried + rewardSpan };
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
