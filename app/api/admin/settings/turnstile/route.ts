import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getTurnstileConfig, setTurnstileConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const incoming = (await req.json().catch(() => ({}))) as any;
  const current = await getTurnstileConfig();
  const next = {
    siteKey: String(incoming.siteKey ?? current.siteKey).trim(),
    secretKey:
      typeof incoming.secretKey === "string" ? incoming.secretKey.trim() : current.secretKey
  };

  await setTurnstileConfig(next, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "settings.turnstile.update",
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
