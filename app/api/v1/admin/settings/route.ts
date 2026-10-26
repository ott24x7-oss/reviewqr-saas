import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminSettingsPatchSchema } from "@reviewqr/shared";
import { parseJson, v1From } from "@/lib/api/v1";
import { commitAdminWrite } from "@/lib/admin/finish";
import { requireAdminActor, requireStepUp } from "@/lib/admin/guard";
import { loadAdminSettings, patchAdminSettings, settingsPatchIsSensitive } from "@/lib/admin/settings-admin";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAdminSettings(auth.actor.user.id));
}

async function putHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminSettingsPatchSchema);
  if (!parsed.ok) return parsed.response;
  if (settingsPatchIsSensitive(parsed.data)) {
    const step = await requireStepUp(req, auth.actor);
    if (!step.ok) return step.response;
  }
  return commitAdminWrite(auth.actor, req, await patchAdminSettings(auth.actor.user.id, parsed.data), {
    action: "settings.admin",
    entity: "Settings",
    entityId: auth.actor.user.id
  });
}

export const GET = observe(getHandler);
export const PUT = observe(putHandler);
