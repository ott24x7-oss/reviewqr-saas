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

/**
 * A lifetime plan has no end date, so it must not be queued as a downgrade.
 * A higher-priced lifetime plan is still an upgrade. Anything else is blocked.
 */
export function lifetimeChangeError(input: {
  currentLifetime: boolean;
  targetLifetime: boolean;
  currentPricePaise: number;
  targetPricePaise: number;
}) {
  if (!input.currentLifetime) return null;
  if (input.targetLifetime && input.targetPricePaise > input.currentPricePaise) return null;
  return "You have a lifetime plan";
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

/** Only money that was actually paid. A catalogue price is not a payment. */
export function creditBasePaise(lastPaymentPaise: number) {
  return Math.max(0, Math.floor(lastPaymentPaise || 0));
}

/**
 * Unused part of the last real payment.
 * Bonus days sit after the paid end and are not credited.
 */
export function unusedPaidCredit(input: {
  paidPaise: number;
  startsAt: Date;
  endsAt: Date | null;
  bonusDays: number;
  duration: PlanDuration | null;
  now?: Date;
}) {
  const paid = creditBasePaise(input.paidPaise);
  if (paid <= 0) return 0;
  const paidEnd = paidEndsAt(input.endsAt, input.bonusDays);
  if (!paidEnd) return paid;
  const months = durationMonths(input.duration ?? inferDuration(input.startsAt, paidEnd)) ?? 1;
  const coveredStart = addMonths(paidEnd, -Math.max(1, months));
  const startsAt = coveredStart.getTime() > input.startsAt.getTime() ? coveredStart : input.startsAt;
  return prorateCredit({ pricePaidPaise: paid, startsAt, endsAt: paidEnd, now: input.now });
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
 * An upgrade starts today and lasts the purchased months.
 * Credit reduces the price. It does not add days.
 */
export function upgradeEndsAt(input: { now: Date; months: number }) {
  const months = Math.max(1, Math.floor(input.months) || 1);
  return addMonths(input.now, months);
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
