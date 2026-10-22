import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { reassignBusinessAgent } from "@/lib/plans/attribution";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  action: z.enum(["update", "reassign"]),
  name: z.string().trim().max(80).optional(),
  upiId: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  active: z.boolean().optional(),
  businessId: z.string().optional(),
  agentUserId: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.action === "reassign") {
    const businessId = parsed.data.businessId || "";
    const agentUserId = parsed.data.agentUserId || params.id;
    const result = await reassignBusinessAgent(businessId, agentUserId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  } else {
    const profile = await prisma.agentProfile.findUnique({ where: { id: params.id }, select: { userId: true } });
    if (!profile) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    await prisma.agentProfile.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.upiId !== undefined ? { upiId: parsed.data.upiId } : {}),
        ...(parsed.data.city !== undefined ? { city: parsed.data.city } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {})
      }
    });
    if (parsed.data.name) {
      await prisma.user.update({ where: { id: profile.userId }, data: { name: parsed.data.name } });
    }
  }

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
