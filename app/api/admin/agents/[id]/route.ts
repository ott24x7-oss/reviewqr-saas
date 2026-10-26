import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { applyAdminTeamAction } from "@/lib/admin/team-admin";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  action: z.enum(["update", "reassign", "approve", "reject", "pause", "resume", "share", "move"]),
  name: z.string().trim().max(80).optional(),
  upiId: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  active: z.boolean().optional(),
  businessId: z.string().optional(),
  agentUserId: z.string().optional(),
  sharePercent: z.number().int().optional(),
  leaderUserId: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const result = await applyAdminTeamAction(params.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await logAudit({
    userId: guard.user.id,
    action: "agent.update",
    entity: "AgentProfile",
    entityId: params.id,
    metadata: { op: parsed.data.action },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
