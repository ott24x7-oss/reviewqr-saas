import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { getAppReleaseConfig, getSiteConfig, setAppReleaseConfig, setSiteConfig } from "@/lib/settings";
import { getTeamProgramSettings, saveTeamProgramSettings, type TeamProgramSettings } from "@/lib/plans/team-settings";

const FLAGS_KEY = "admin.flags";

const NOTIFY_DEFAULT = {
  paidPayment: true,
  failedPayment: true,
  signup: true,
  agentPending: true,
  printProof: true,
  payoutDue: true,
  supportTicket: true,
  whatsappDown: true
};

type SettingsPatch = {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  autoApproveSubAgents?: boolean;
  maxTeamDepth?: number;
  minSharePercent?: number;
  maxSharePercent?: number;
  tdsPercent?: number;
  tdsYearlyThresholdPaise?: number;
  minVersionCode?: number;
  latestVersionCode?: number;
  flags?: Record<string, boolean>;
  notify?: Partial<typeof NOTIFY_DEFAULT>;
};

export function settingsPatchIsSensitive(body: SettingsPatch) {
  return (
    body.minSharePercent !== undefined ||
    body.maxSharePercent !== undefined ||
    body.tdsPercent !== undefined ||
    body.tdsYearlyThresholdPaise !== undefined
  );
}

async function readFlags() {
  const row = await prisma.appSetting.findUnique({ where: { key: FLAGS_KEY } });
  if (!row) return {};
  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const flags: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean") flags[key] = value;
    }
    return flags;
  } catch {
    return {};
  }
}

export async function loadAdminSettings(userId: string) {
  const [site, team, release, flags, notify] = await Promise.all([
    getSiteConfig(),
    getTeamProgramSettings(),
    getAppReleaseConfig(),
    readFlags(),
    prisma.adminNotifyPref.findUnique({ where: { userId } })
  ]);
  return ok({
    maintenanceMode: site.maintenanceMode,
    maintenanceMessage: site.maintenanceMessage,
    maxTeamDepth: team.maxTeamDepth,
    minSharePercent: team.minSharePercent,
    maxSharePercent: team.maxSharePercent,
    autoApproveSubAgents: team.autoApproveSubAgents,
    tdsPercent: team.tdsPercent,
    tdsYearlyThresholdPaise: team.tdsYearlyThresholdPaise,
    minVersionCode: release.minVersionCode,
    latestVersionCode: release.latestVersionCode,
    flags,
    notify: notify
      ? {
          paidPayment: notify.paidPayment,
          failedPayment: notify.failedPayment,
          signup: notify.signup,
          agentPending: notify.agentPending,
          printProof: notify.printProof,
          payoutDue: notify.payoutDue,
          supportTicket: notify.supportTicket,
          whatsappDown: notify.whatsappDown
        }
      : NOTIFY_DEFAULT
  });
}

export async function patchAdminSettings(userId: string, body: SettingsPatch) {
  const before = await loadAdminSettings(userId);
  if (!before.ok) return fail(500, "Could not read settings");
  if (body.maintenanceMode !== undefined || body.maintenanceMessage !== undefined) {
    const site = await getSiteConfig();
    await setSiteConfig(
      {
        ...site,
        ...(body.maintenanceMode !== undefined ? { maintenanceMode: body.maintenanceMode } : {}),
        ...(body.maintenanceMessage !== undefined ? { maintenanceMessage: body.maintenanceMessage } : {})
      },
      userId
    );
  }
  const teamPatch: Partial<TeamProgramSettings> = {};
  if (body.autoApproveSubAgents !== undefined) teamPatch.autoApproveSubAgents = body.autoApproveSubAgents;
  if (body.maxTeamDepth !== undefined) teamPatch.maxTeamDepth = body.maxTeamDepth;
  if (body.minSharePercent !== undefined) teamPatch.minSharePercent = body.minSharePercent;
  if (body.maxSharePercent !== undefined) teamPatch.maxSharePercent = body.maxSharePercent;
  if (body.tdsPercent !== undefined) teamPatch.tdsPercent = body.tdsPercent;
  if (body.tdsYearlyThresholdPaise !== undefined) teamPatch.tdsYearlyThresholdPaise = body.tdsYearlyThresholdPaise;
  if (Object.keys(teamPatch).length) {
    const current = await getTeamProgramSettings();
    await saveTeamProgramSettings({ ...current, ...teamPatch }, userId);
  }
  if (body.minVersionCode !== undefined || body.latestVersionCode !== undefined) {
    const release = await getAppReleaseConfig();
    await setAppReleaseConfig(
      {
        minVersionCode: body.minVersionCode ?? release.minVersionCode,
        latestVersionCode: body.latestVersionCode ?? release.latestVersionCode
      },
      userId
    );
  }
  if (body.flags) {
    const flags = { ...(await readFlags()), ...body.flags };
    await prisma.appSetting.upsert({
      where: { key: FLAGS_KEY },
      create: { key: FLAGS_KEY, value: JSON.stringify(flags), updatedBy: userId },
      update: { value: JSON.stringify(flags), updatedBy: userId }
    });
  }
  if (body.notify) {
    await prisma.adminNotifyPref.upsert({
      where: { userId },
      create: { userId, ...body.notify },
      update: body.notify
    });
  }
  const after = await loadAdminSettings(userId);
  if (!after.ok) return fail(500, "Could not read settings");
  return ok({ before: before.data, after: after.data });
}
