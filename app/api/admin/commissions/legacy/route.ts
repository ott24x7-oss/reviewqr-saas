import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { decideLegacyCommission } from "@/lib/plans/payout";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "paid"]),
  reason: z.string().trim().min(1).max(500)
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose a commission and enter a reason" }, { status: 400 });
  const before = await prisma.shopCommission.findUnique({
    where: { id: parsed.data.id },
    select: { status: true }
  });
  if (!before) return NextResponse.json({ error: "Commission not found" }, { status: 404 });
  const result = await decideLegacyCommission(parsed.data.id, parsed.data.action);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await logAudit({
    userId: guard.user.id,
    action: "commission.legacy",
    entity: "ShopCommission",
    entityId: parsed.data.id,
    reason: parsed.data.reason,
    before: { status: before.status },
    after: { status: parsed.data.action === "approve" ? "APPROVED" : "PAID" },
    metadata: { action: parsed.data.action },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
