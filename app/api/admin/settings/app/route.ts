import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { normalizeAppRelease } from "@/lib/app/release";
import { setAppReleaseConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const incoming = (await req.json().catch(() => ({}))) as { minVersionCode?: unknown; latestVersionCode?: unknown };
  const next = normalizeAppRelease({
    minVersionCode: Number(incoming.minVersionCode),
    latestVersionCode: Number(incoming.latestVersionCode)
  });
  await setAppReleaseConfig(next, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "settings.app.update",
    entity: "AppSetting",
    metadata: next,
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true, ...next });
}
