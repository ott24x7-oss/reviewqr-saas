import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getBaileys } from "@/lib/whatsapp-baileys";
import { getClientIp } from "@/lib/utils";
import { spendWebStepUp, stepUpRequired } from "@/lib/admin/web-step";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  if (!(await spendWebStepUp(req, guard.user.id, "whatsapp_pairing"))) {
    return stepUpRequired("whatsapp_pairing", "Enter the WhatsApp code before changing the paired device");
  }

  const url = new URL(req.url);
  const logout = url.searchParams.get("logout") === "1";

  const mgr = getBaileys();
  const before = mgr.getInfo();
  await mgr.stop({ logout });
  const after = mgr.getInfo();

  await logAudit({
    userId: guard.user.id,
    action: "settings.whatsapp.update",
    before: { status: before.status, phoneNumber: before.phoneNumber },
    after: { action: logout ? "baileys.logout" : "baileys.disconnect", status: after.status, phoneNumber: after.phoneNumber },
    metadata: { action: logout ? "baileys.logout" : "baileys.disconnect" },
    ip: getClientIp(req.headers)
  });

  return NextResponse.json({ ok: true, info: mgr.getInfo() });
}
