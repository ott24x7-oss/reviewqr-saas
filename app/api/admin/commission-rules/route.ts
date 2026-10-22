import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  id: z.string().optional(),
  agentId: z.string().nullable().optional(),
  planId: z.string().nullable().optional(),
  hardware: z.boolean(),
  firstBasis: z.enum(["PERCENT", "FLAT"]),
  firstPercent: z.number().int().min(0).max(100),
  firstFlatPaise: z.number().int().min(0),
  renewalBasis: z.enum(["PERCENT", "FLAT"]),
  renewalPercent: z.number().int().min(0).max(100),
  renewalFlatPaise: z.number().int().min(0),
  renewalMonths: z.number().int().min(0).nullable(),
  active: z.boolean()
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid rule" }, { status: 400 });
  }
  const data = parsed.data;
  const scope = {
    agentId: data.agentId || null,
    planId: data.planId || null,
    hardware: data.hardware
  };
  const fields = {
    ...scope,
    firstBasis: data.firstBasis,
    firstPercent: data.firstPercent,
    firstFlatPaise: data.firstFlatPaise,
    renewalBasis: data.renewalBasis,
    renewalPercent: data.renewalPercent,
    renewalFlatPaise: data.renewalFlatPaise,
    renewalMonths: data.renewalMonths,
    active: data.active
  };
  const existing = data.id
    ? await prisma.commissionRule.findUnique({ where: { id: data.id } })
    : await prisma.commissionRule.findFirst({ where: scope });
  const rule = existing
    ? await prisma.commissionRule.update({ where: { id: existing.id }, data: fields })
    : await prisma.commissionRule.create({ data: fields });
  await logAudit({
    userId: guard.user.id,
    action: "agent.update",
    entity: "CommissionRule",
    entityId: rule.id,
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ id: rule.id });
}
