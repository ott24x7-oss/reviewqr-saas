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
    return stepUpRequired("whatsapp_pairing", "Enter the WhatsApp code before pairing a device");
  }

  const mgr = getBaileys();
  const before = mgr.getInfo();
  // Don't await — start() runs the connection lifecycle async.
  // The admin UI polls /status to follow progress.
  mgr.start().catch((e) => console.error("[baileys] start error:", e));

  await logAudit({
    userId: guard.user.id,
    action: "settings.whatsapp.update",
    before: { status: before.status },
    after: { action: "baileys.connect", status: mgr.getInfo().status },
    metadata: { action: "baileys.connect" },
    ip: getClientIp(req.headers)
  });

  return NextResponse.json({ ok: true, info: mgr.getInfo() });
}
