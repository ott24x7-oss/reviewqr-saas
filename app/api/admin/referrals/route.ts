import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { savePlanProgramSettings } from "@/lib/plans/settings";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  holdDays: z.number().int().min(0).max(365),
  commissionHoldDays: z.number().int().min(0).max(365),
  maxMonthsPerYear: z.number().int().min(0).max(120),
  newBusinessDays: z.number().int().min(0).max(365),
  monthsByDuration: z.object({
    MONTH_1: z.number().int().min(0).max(36),
    MONTH_6: z.number().int().min(0).max(36),
    YEAR_1: z.number().int().min(0).max(36),
    LIFETIME: z.number().int().min(0).max(36)
  })
});

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid reward settings" }, { status: 400 });
  }
  await savePlanProgramSettings(parsed.data, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "referral.update",
    entity: "AppSetting",
    entityId: "plans.rewards",
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
