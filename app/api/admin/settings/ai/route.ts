import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getAiConfig, setAiConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const incoming = (await req.json().catch(() => ({}))) as any;
  const current = await getAiConfig();
  const next = {
    enabled: typeof incoming.enabled === "boolean" ? incoming.enabled : current.enabled,
    apiUrl: String(incoming.apiUrl ?? current.apiUrl).trim().replace(/\/$/, ""),
    apiKey: typeof incoming.apiKey === "string" ? incoming.apiKey.trim() : current.apiKey,
    model: String(incoming.model ?? current.model).trim()
  };

  await setAiConfig(next, guard.user.id);
  await logAudit({ userId: guard.user.id, action: "settings.ai.update", ip: getClientIp(req.headers) });
  return NextResponse.json({ ok: true });
}
