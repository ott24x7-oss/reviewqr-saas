import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminCommissionActionSchema } from "@reviewqr/shared";
import { parseJson, v1From } from "@/lib/api/v1";
import type { ServiceResult } from "@/lib/api/result";
import { commitAdminWrite, moneyReason } from "@/lib/admin/finish";
import { requireAdminActor, requireStepUp } from "@/lib/admin/guard";
import { approveAdminCommissions, listAdminCommissions, payAdminCommissions } from "@/lib/admin/money";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1From(await listAdminCommissions(req.nextUrl.searchParams));
}

async function postHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminCommissionActionSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (body.action === "pay") {
    const missing = moneyReason(body.reason);
    if (missing) return missing;
    const step = await requireStepUp(req, auth.actor);
    if (!step.ok) return step.response;
  }
  const result =
    body.action === "pay"
      ? await payAdminCommissions(body.agentId, body.utr || "")
      : await approveAdminCommissions(body.agentId);
  return commitAdminWrite(auth.actor, req, result as ServiceResult<unknown>, {
    action: body.action === "pay" ? "commission.pay" : "commission.approve",
    entity: "User",
    entityId: body.agentId,
    reason: body.reason,
    money: body.action === "pay"
  });
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);
