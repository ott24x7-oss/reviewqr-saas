import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getBaileys } from "@/lib/whatsapp-baileys";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const logout = url.searchParams.get("logout") === "1";

  const mgr = getBaileys();
  await mgr.stop({ logout });

  await logAudit({
    userId: guard.user.id,
    action: "settings.whatsapp.update",
    metadata: { action: logout ? "baileys.logout" : "baileys.disconnect" },
    ip: getClientIp(req.headers)
  });

  return NextResponse.json({ ok: true, info: mgr.getInfo() });
}
