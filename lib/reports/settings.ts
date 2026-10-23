import { prisma } from "../db";

export type InsightSettings = {
  whatsappNumber: string;
  reportHourIst: number;
  reportMinuteIst: number;
  reportMaxPerMinute: number;
};

export const INSIGHT_DEFAULTS: InsightSettings = {
  whatsappNumber: "",
  reportHourIst: 9,
  reportMinuteIst: 0,
  reportMaxPerMinute: 20
};

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

export function normalizeInsightSettings(value: unknown): InsightSettings {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const digits = String(row.whatsappNumber || "").replace(/[^\d]/g, "").slice(0, 15);
  return {
    whatsappNumber: digits,
    reportHourIst: clamp(row.reportHourIst, 0, 23, INSIGHT_DEFAULTS.reportHourIst),
    reportMinuteIst: clamp(row.reportMinuteIst, 0, 59, INSIGHT_DEFAULTS.reportMinuteIst),
    reportMaxPerMinute: clamp(row.reportMaxPerMinute, 1, 60, INSIGHT_DEFAULTS.reportMaxPerMinute)
  };
}

export async function getInsightSettings() {
  const row = await prisma.appSetting.findUnique({ where: { key: "support" } });
  if (!row) return INSIGHT_DEFAULTS;
  try {
    return normalizeInsightSettings(JSON.parse(row.value));
  } catch {
    return INSIGHT_DEFAULTS;
  }
}

export async function saveInsightSettings(value: unknown, updatedBy?: string) {
  const next = normalizeInsightSettings(value);
  await prisma.appSetting.upsert({
    where: { key: "support" },
    create: { key: "support", value: JSON.stringify(next), updatedBy },
    update: { value: JSON.stringify(next), updatedBy }
  });
  return next;
}
