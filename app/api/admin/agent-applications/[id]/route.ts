import { NextRequest, NextResponse } from "next/server";
import { adminAgentApplicationDecisionSchema } from "@reviewqr/shared";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { reviewResellerApplication } from "@/lib/plans/agent-applications";
import { getClientIp } from "@/lib/utils";

export async function POST(req: NextRequest, context: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = adminAgentApplicationDecisionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid application decision" }, { status: 400 });
  const result = await reviewResellerApplication({ applicationId: context.params.id, ...parsed.data, actorId: guard.user.id });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logAudit({
    userId: guard.user.id,
    action: "agent.update",
    entity: "AgentApplication",
    entityId: context.params.id,
    reason: parsed.data.reason,
    before: result.data.before,
    after: result.data.after,
    metadata: { op: parsed.data.action, leaderId: parsed.data.leaderId ?? null, sharePercent: parsed.data.sharePercent ?? null },
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent") || undefined
  });
  return NextResponse.json({ status: result.data.status });
}
