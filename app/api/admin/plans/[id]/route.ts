import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { archivePlan, duplicatePlan, planWriteSchema, updatePlanRecord } from "@/lib/plans/admin-write";
import { revalidatePricing } from "@/lib/plans/revalidate";
import { getClientIp } from "@/lib/utils";

const actionSchema = z.object({ action: z.enum(["archive", "duplicate"]) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = planWriteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid plan" }, { status: 400 });
  }
  const result = await updatePlanRecord(params.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === "Plan not found" ? 404 : 400 });
  revalidatePricing(result.plan.slug);
  await logAudit({
    userId: guard.user.id,
    action: "plan.update",
    entity: "Plan",
    entityId: params.id,
    metadata: { op: "edit" },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true, slug: result.plan.slug });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  if (parsed.data.action === "archive") {
    try {
      const plan = await archivePlan(params.id);
      revalidatePricing(plan.slug);
    } catch {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
  } else {
    const copy = await duplicatePlan(params.id);
    if (!copy.ok) return NextResponse.json({ error: copy.error }, { status: 404 });
    revalidatePricing(copy.plan.slug);
  }
  await logAudit({
    userId: guard.user.id,
    action: "plan.update",
    entity: "Plan",
    entityId: params.id,
    metadata: { op: parsed.data.action },
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
