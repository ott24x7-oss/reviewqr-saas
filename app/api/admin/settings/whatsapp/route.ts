import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getWhatsAppConfig, setWhatsAppConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const incoming = (await req.json().catch(() => ({}))) as any;
  const current = await getWhatsAppConfig();
  const next = {
    apiUrl: String(incoming.apiUrl ?? current.apiUrl).trim(),
    apiToken:
      typeof incoming.apiToken === "string" ? incoming.apiToken.trim() : current.apiToken,
    phoneId: String(incoming.phoneId ?? current.phoneId).trim()
  };

  await setWhatsAppConfig(next, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "settings.whatsapp.update",
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
