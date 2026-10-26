import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminWhatsAppTestSchema } from "@reviewqr/shared";
import { parseJson } from "@/lib/api/v1";
import { commitAdminWrite } from "@/lib/admin/finish";
import { requireAdminActor } from "@/lib/admin/guard";
import { sendAdminWhatsAppTest } from "@/lib/admin/whatsapp-admin";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminWhatsAppTestSchema);
  if (!parsed.ok) return parsed.response;
  return commitAdminWrite(auth.actor, req, await sendAdminWhatsAppTest(auth.actor.user.id, parsed.data.message), {
    action: "settings.whatsapp.update",
    entity: "WhatsApp",
    entityId: auth.actor.user.id,
    metadata: { action: "test.send" }
  });
}
export const POST = observe(postHandler);
