import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminDeviceActionSchema } from "@reviewqr/shared";
import { parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { adminDeviceRows, setAdminDeviceStatus } from "@/lib/admin/devices";
import { requireAdminActor, requireStepUp } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminDeviceActionSchema);
  if (!parsed.ok) return parsed.response;
  if (parsed.data.action === "approve") {
    const step = await requireStepUp(req, auth.actor);
    if (!step.ok) return step.response;
  }
  const result = await setAdminDeviceStatus({
    deviceId: context?.params.id || "",
    action: parsed.data.action,
    actorId: auth.actor.user.id,
    ip: auth.actor.ip,
    actorDeviceId: auth.actor.device.id
  });
  if (!result.ok) return v1Error(result.status, result.status === 404 ? "NOT_FOUND" : "VALIDATION", result.error);
  return v1Data({ devices: await adminDeviceRows() });
}
export const POST = observe(postHandler);
