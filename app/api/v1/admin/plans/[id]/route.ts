import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminPlanPatchSchema } from "@reviewqr/shared";
import { parseJson } from "@/lib/api/v1";
import { commitAdminWrite } from "@/lib/admin/finish";
import { requireAdminActor, requireStepUp } from "@/lib/admin/guard";
import { patchAdminPlan, planPatchIsSensitive } from "@/lib/admin/plans-admin";

export const dynamic = "force-dynamic";

async function patchHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminPlanPatchSchema);
  if (!parsed.ok) return parsed.response;
  if (planPatchIsSensitive(parsed.data)) {
    const step = await requireStepUp(req, auth.actor);
    if (!step.ok) return step.response;
  }
  const id = context?.params.id || "";
  return commitAdminWrite(auth.actor, req, await patchAdminPlan(id, parsed.data), {
    action: "plan.update",
    entity: "Plan",
    entityId: id
  });
}
export const PATCH = observe(patchHandler);
