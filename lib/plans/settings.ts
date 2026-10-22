import { prisma } from "../db";
import { DEFAULT_COMMISSION_HOLD_DAYS, DEFAULT_REWARD_TABLE, type RewardTable } from "./referral";

const KEY = "plans.rewards";

export type PlanProgramSettings = RewardTable & { commissionHoldDays: number };

function whole(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export function normalizeProgramSettings(value: unknown): PlanProgramSettings {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const months =
    row.monthsByDuration && typeof row.monthsByDuration === "object"
      ? (row.monthsByDuration as Record<string, unknown>)
      : {};
  return {
    holdDays: whole(row.holdDays, DEFAULT_REWARD_TABLE.holdDays),
    maxMonthsPerYear: whole(row.maxMonthsPerYear, DEFAULT_REWARD_TABLE.maxMonthsPerYear),
    newBusinessDays: whole(row.newBusinessDays, DEFAULT_REWARD_TABLE.newBusinessDays),
    commissionHoldDays: whole(row.commissionHoldDays, DEFAULT_COMMISSION_HOLD_DAYS),
    monthsByDuration: {
      MONTH_1: whole(months.MONTH_1, DEFAULT_REWARD_TABLE.monthsByDuration.MONTH_1),
      MONTH_6: whole(months.MONTH_6, DEFAULT_REWARD_TABLE.monthsByDuration.MONTH_6),
      YEAR_1: whole(months.YEAR_1, DEFAULT_REWARD_TABLE.monthsByDuration.YEAR_1),
      LIFETIME: whole(months.LIFETIME, DEFAULT_REWARD_TABLE.monthsByDuration.LIFETIME)
    }
  };
}

export async function getPlanProgramSettings() {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
    if (!row) return normalizeProgramSettings(null);
    return normalizeProgramSettings(JSON.parse(row.value));
  } catch {
    return normalizeProgramSettings(null);
  }
}

export async function savePlanProgramSettings(value: unknown, updatedBy?: string) {
  const normalized = normalizeProgramSettings(value);
  await prisma.appSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(normalized), updatedBy: updatedBy || null },
    update: { value: JSON.stringify(normalized), updatedBy: updatedBy || null }
  });
  return normalized;
}
