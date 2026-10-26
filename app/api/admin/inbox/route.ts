import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { applyInboxAction } from "@/lib/admin/inbox";
import { spendWebStepUp, stepUpRequired } from "@/lib/admin/web-step";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  segment: z.string().min(1),
  action: z.string().min(1),
  id: z.string().optional(),
  ids: z.array(z.string()).max(50).optional(),
  reason: z.string().trim().min(1).max(500)
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a reason" }, { status: 400 });
  if (
    parsed.data.segment === "devices" &&
    parsed.data.action === "approve" &&
    !(await spendWebStepUp(req, guard.user.id, "approve_device"))
  ) {
    return stepUpRequired("approve_device");
  }
  const result = await applyInboxAction({
    segment: parsed.data.segment,
    action: parsed.data.action,
    id: parsed.data.id,
    ids: parsed.data.ids,
    actorId: guard.user.id,
    ip: getClientIp(req.headers)
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logAudit({
    userId: guard.user.id,
    action: "inbox.action",
    entity: "Inbox",
    entityId: parsed.data.id || parsed.data.ids?.[0],
    reason: parsed.data.reason,
    metadata: { segment: parsed.data.segment, op: parsed.data.action, changed: result.data.changed },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true, changed: result.data.changed });
}
