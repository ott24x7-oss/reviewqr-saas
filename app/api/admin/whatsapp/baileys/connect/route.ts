import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getBaileys } from "@/lib/whatsapp-baileys";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const mgr = getBaileys();
  // Don't await — start() runs the connection lifecycle async.
  // The admin UI polls /status to follow progress.
  mgr.start().catch((e) => console.error("[baileys] start error:", e));

  await logAudit({
    userId: guard.user.id,
    action: "settings.whatsapp.update",
    metadata: { action: "baileys.connect" },
    ip: getClientIp(req.headers)
  });

  return NextResponse.json({ ok: true, info: mgr.getInfo() });
}
