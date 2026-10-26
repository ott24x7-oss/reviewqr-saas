import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { saveTeamProgramSettings } from "@/lib/plans/team-settings";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  maxTeamDepth: z.number().int().min(1).max(5),
  minSharePercent: z.number().int().min(0).max(100),
  maxSharePercent: z.number().int().min(0).max(100),
  autoApproveSubAgents: z.boolean(),
  tdsPercent: z.number().int().min(0).max(30),
  tdsYearlyThresholdPaise: z.number().int().min(0)
});

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Check the team settings" }, { status: 400 });
  if (parsed.data.maxSharePercent < parsed.data.minSharePercent) {
    return NextResponse.json({ error: "The maximum share cannot be below the minimum" }, { status: 400 });
  }
  const saved = await saveTeamProgramSettings(parsed.data, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "agent.update",
    entity: "AppSetting",
    entityId: "plans.team",
    metadata: saved,
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true, settings: saved });
}
