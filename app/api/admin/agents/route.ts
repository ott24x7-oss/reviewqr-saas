import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { createAgentAccount } from "@/lib/plans/agents";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(10).max(20),
  email: z.string().trim().email().optional().or(z.literal("")),
  upiId: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  active: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid agent" }, { status: 400 });
  }
  const result = await createAgentAccount(parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await logAudit({
    userId: guard.user.id,
    action: "agent.update",
    entity: "AgentProfile",
    entityId: result.profile.id,
    metadata: { op: "create" },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ id: result.profile.id, code: result.profile.code });
}
