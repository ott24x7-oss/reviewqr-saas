import { prisma } from "../db";

const KEY = "plans.team";

export type TeamProgramSettings = {
  maxTeamDepth: number;
  minSharePercent: number;
  maxSharePercent: number;
  autoApproveSubAgents: boolean;
  tdsPercent: number;
  tdsYearlyThresholdPaise: number;
};

/** Sec 194H is 5% once commission in a financial year crosses ₹15,000. These are defaults, not the pay formula. */
export const DEFAULT_TEAM_SETTINGS: TeamProgramSettings = {
  maxTeamDepth: 2,
  minSharePercent: 50,
  maxSharePercent: 90,
  autoApproveSubAgents: false,
  tdsPercent: 5,
  tdsYearlyThresholdPaise: 1_500_000
};

function whole(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function normalizeTeamSettings(value: unknown): TeamProgramSettings {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const minSharePercent = whole(row.minSharePercent, DEFAULT_TEAM_SETTINGS.minSharePercent, 0, 100);
  let maxSharePercent = whole(row.maxSharePercent, DEFAULT_TEAM_SETTINGS.maxSharePercent, 0, 100);
  if (maxSharePercent < minSharePercent) maxSharePercent = minSharePercent;
  return {
    maxTeamDepth: whole(row.maxTeamDepth, DEFAULT_TEAM_SETTINGS.maxTeamDepth, 1, 5),
    minSharePercent,
    maxSharePercent,
    autoApproveSubAgents: row.autoApproveSubAgents === true,
    tdsPercent: whole(row.tdsPercent, DEFAULT_TEAM_SETTINGS.tdsPercent, 0, 30),
    tdsYearlyThresholdPaise: whole(
      row.tdsYearlyThresholdPaise,
      DEFAULT_TEAM_SETTINGS.tdsYearlyThresholdPaise,
      0,
      100_000_000_00
    )
  };
}

export async function getTeamProgramSettings() {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
    if (!row) return normalizeTeamSettings(null);
    return normalizeTeamSettings(JSON.parse(row.value));
  } catch {
    return normalizeTeamSettings(null);
  }
}

export async function saveTeamProgramSettings(value: unknown, updatedBy?: string) {
  const normalized = normalizeTeamSettings(value);
  await prisma.appSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(normalized), updatedBy: updatedBy || null },
    update: { value: JSON.stringify(normalized), updatedBy: updatedBy || null }
  });
  return normalized;
}
