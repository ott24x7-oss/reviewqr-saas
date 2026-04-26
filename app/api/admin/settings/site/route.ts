import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getSiteConfig, setSiteConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const incoming = (await req.json().catch(() => ({}))) as any;
  const current = await getSiteConfig();
  const next = {
    appName: String(incoming.appName ?? current.appName).trim().slice(0, 60) || current.appName,
    supportEmail: String(incoming.supportEmail ?? current.supportEmail).trim(),
    appUrl: String(incoming.appUrl ?? current.appUrl).trim().replace(/\/$/, ""),
    marketingTagline: String(incoming.marketingTagline ?? current.marketingTagline).slice(0, 300),
    signupsEnabled: incoming.signupsEnabled ?? current.signupsEnabled,
    maintenanceMode: !!incoming.maintenanceMode,
    maintenanceMessage: String(
      incoming.maintenanceMessage ?? current.maintenanceMessage
    ).slice(0, 500)
  };

  await setSiteConfig(next, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "settings.site.update",
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
