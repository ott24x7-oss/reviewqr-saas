import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { patchAdminSettings, settingsPatchIsSensitive } from "@/lib/admin/settings-admin";
import { readWebStepUp } from "@/lib/admin/web-step";
import { getClientIp } from "@/lib/utils";

const notify = z.object({
  paidPayment: z.boolean().optional(),
  failedPayment: z.boolean().optional(),
  signup: z.boolean().optional(),
  agentPending: z.boolean().optional(),
  printProof: z.boolean().optional(),
  payoutDue: z.boolean().optional(),
  supportTicket: z.boolean().optional(),
  whatsappDown: z.boolean().optional()
});

const schema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(240).optional(),
  autoApproveSubAgents: z.boolean().optional(),
  maxTeamDepth: z.number().int().min(1).max(8).optional(),
  minSharePercent: z.number().int().min(0).max(100).optional(),
  maxSharePercent: z.number().int().min(0).max(100).optional(),
  tdsPercent: z.number().int().min(0).max(100).optional(),
  tdsYearlyThresholdPaise: z.number().int().min(0).optional(),
  flags: z.record(z.boolean()).optional(),
  notify: notify.optional(),
  reason: z.string().trim().max(500).optional()
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Check the settings" }, { status: 400 });
  const { reason, ...patch } = parsed.data;
  if (settingsPatchIsSensitive(patch) && !readWebStepUp(guard.user.id)) {
    return NextResponse.json({ error: "Enter the WhatsApp code to confirm this" }, { status: 403 });
  }
  if (settingsPatchIsSensitive(patch) && !reason?.trim()) {
    return NextResponse.json({ error: "Enter a reason" }, { status: 400 });
  }
  const result = await patchAdminSettings(guard.user.id, patch);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logAudit({
    userId: guard.user.id,
    action: "settings.admin",
    entity: "Settings",
    entityId: guard.user.id,
    reason,
    before: result.data.before,
    after: result.data.after,
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
