import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getEmailConfig, setEmailConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const incoming = (await req.json().catch(() => ({}))) as any;
  const current = await getEmailConfig();
  const next = {
    relayUrl: String(incoming.relayUrl ?? current.relayUrl).trim(),
    relaySecret:
      typeof incoming.relaySecret === "string" ? incoming.relaySecret : current.relaySecret,
    smtpHost: String(incoming.smtpHost ?? current.smtpHost).trim(),
    smtpPort: Math.max(1, Math.min(65535, Number(incoming.smtpPort ?? current.smtpPort) || 587)),
    smtpUser: String(incoming.smtpUser ?? current.smtpUser).trim(),
    smtpPass: typeof incoming.smtpPass === "string" ? incoming.smtpPass : current.smtpPass,
    smtpFrom: String(incoming.smtpFrom ?? current.smtpFrom).trim()
  };

  await setEmailConfig(next, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "settings.email.update",
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
