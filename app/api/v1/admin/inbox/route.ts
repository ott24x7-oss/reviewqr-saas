import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminInboxActionSchema } from "@reviewqr/shared";
import { parseJson, v1From } from "@/lib/api/v1";
import { applyInboxAction, loadAdminInbox } from "@/lib/admin/inbox";
import { commitAdminWrite } from "@/lib/admin/finish";
import { requireAdminActor, requireStepUp } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAdminInbox(req.nextUrl.searchParams));
}

async function postHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminInboxActionSchema);
  if (!parsed.ok) return parsed.response;
  if (parsed.data.segment === "devices" && parsed.data.action === "approve") {
    const step = await requireStepUp(req, auth.actor, "approve_device");
    if (!step.ok) return step.response;
  }
  const result = await applyInboxAction({
    segment: parsed.data.segment,
    action: parsed.data.action,
    id: parsed.data.id,
    ids: parsed.data.ids,
    actorId: auth.actor.user.id,
    actorDeviceId: auth.actor.device.id,
    ip: auth.actor.ip
  });
  const selfAudit = parsed.data.segment === "devices" || parsed.data.segment === "proofs" || parsed.data.segment === "shop";
  if (selfAudit) return v1From(result);
  return commitAdminWrite(auth.actor, req, result, {
    action: "inbox.action",
    entity: "Inbox",
    entityId: parsed.data.id || parsed.data.ids?.[0],
    reason: parsed.data.reason,
    metadata: { segment: parsed.data.segment, action: parsed.data.action }
  });
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);
