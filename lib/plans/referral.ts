import type { PlanDuration } from "@prisma/client";

export type RewardTable = {
  holdDays: number;
  maxMonthsPerYear: number;
  newBusinessDays: number;
  monthsByDuration: Record<PlanDuration, number>;
};

export const DEFAULT_REWARD_TABLE: RewardTable = {
  holdDays: 7,
  maxMonthsPerYear: 24,
  newBusinessDays: 0,
  monthsByDuration: {
    MONTH_1: 0,
    MONTH_6: 1,
    YEAR_1: 2,
    LIFETIME: 3
  }
};

export const DEFAULT_COMMISSION_HOLD_DAYS = 7;

export function rewardMonthsFor(table: RewardTable, duration: PlanDuration | null | undefined) {
  if (!duration) return 0;
  const months = table.monthsByDuration[duration];
  return Math.max(0, Math.floor(Number(months) || 0));
}

export function cappedRewardMonths(requested: number, alreadyThisYear: number, maxPerYear: number) {
  const ask = Math.max(0, Math.floor(requested));
  const used = Math.max(0, Math.floor(alreadyThisYear));
  const max = Math.max(0, Math.floor(maxPerYear));
  return Math.max(0, Math.min(ask, max - used));
}

export function chooseAttribution(input: { agentCode: boolean; ownerCode: boolean }) {
  if (input.agentCode) return "agent" as const;
  if (input.ownerCode) return "owner" as const;
  return null;
}

function phoneKey(value: string | null | undefined) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function mailKey(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function gstKey(value: string | null | undefined) {
  return (value || "").trim().toUpperCase();
}

export type Identity = {
  id: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  payerVpa?: string | null;
};

/** Same person cannot earn a reward. Returns the reason, or null when the pair is allowed. */
export function referralBlockReason(referrer: Identity, referred: Identity) {
  if (referrer.id && referrer.id === referred.id) return "same-user";
  const referrerPhone = phoneKey(referrer.phone);
  const referredPhone = phoneKey(referred.phone);
  if (referrerPhone && referrerPhone === referredPhone) return "same-phone";
  const referrerEmail = mailKey(referrer.email);
  const referredEmail = mailKey(referred.email);
  if (referrerEmail && referrerEmail === referredEmail) return "same-email";
  const referrerGst = gstKey(referrer.gstin);
  const referredGst = gstKey(referred.gstin);
  if (referrerGst && referrerGst === referredGst) return "same-gstin";
  const referrerVpa = mailKey(referrer.payerVpa);
  const referredVpa = mailKey(referred.payerVpa);
  if (referrerVpa && referrerVpa === referredVpa) return "same-upi";
  return null;
}

export function rewardDestination(hasActivePaidPlan: boolean) {
  return hasActivePaidPlan ? ("extend" as const) : ("credit" as const);
}

export function hasActivePaidPlan(input: {
  tier: string;
  status: string;
  endsAt: Date | null;
  now?: Date;
}) {
  if (input.tier === "FREE" || input.status !== "ACTIVE") return false;
  if (input.tier === "FOUNDER") return true;
  const now = input.now ?? new Date();
  return !!input.endsAt && input.endsAt.getTime() > now.getTime();
}
