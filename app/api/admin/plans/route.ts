import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { planWriteSchema, createPlanRecord } from "@/lib/plans/admin-write";
import { revalidatePricing } from "@/lib/plans/revalidate";
import { getClientIp } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = planWriteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid plan" }, { status: 400 });
  }
  const result = await createPlanRecord(parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  revalidatePricing(result.plan.slug);
  await logAudit({
    userId: guard.user.id,
    action: "plan.update",
    entity: "Plan",
    entityId: result.plan.id,
    metadata: { slug: result.plan.slug, op: "create" },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ id: result.plan.id, slug: result.plan.slug });
}
