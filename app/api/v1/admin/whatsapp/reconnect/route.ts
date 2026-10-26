import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { commitAdminWrite } from "@/lib/admin/finish";
import { requireAdminActor, requireStepUp } from "@/lib/admin/guard";
import { reconnectAdminWhatsApp } from "@/lib/admin/whatsapp-admin";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const step = await requireStepUp(req, auth.actor);
  if (!step.ok) return step.response;
  return commitAdminWrite(auth.actor, req, await reconnectAdminWhatsApp(), {
    action: "settings.whatsapp.update",
    entity: "WhatsApp",
    metadata: { action: "reconnect" }
  });
}
export const POST = observe(postHandler);
