import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { getPricingCopy, setPricingCopy } from "@/lib/plans/pricing-copy";
import { revalidatePricing } from "@/lib/plans/revalidate";
import { getClientIp } from "@/lib/utils";

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  return NextResponse.json(await getPricingCopy());
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const result = await setPricingCopy(await req.json().catch(() => ({})), guard.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  revalidatePricing();
  await logAudit({
    userId: guard.user.id,
    action: "pricing.update",
    entity: "AppSetting",
    entityId: "pricing.copy",
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
