import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { decideLegacyCommission } from "@/lib/plans/payout";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "paid"])
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose a commission" }, { status: 400 });
  const result = await decideLegacyCommission(parsed.data.id, parsed.data.action);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await logAudit({
    userId: guard.user.id,
    action: "commission.legacy",
    entity: "ShopCommission",
    entityId: parsed.data.id,
    metadata: { action: parsed.data.action },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
