import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { getShopCheckoutConfig, setShopCheckoutConfig } from "@/lib/settings";
import { shopCheckoutError } from "@/lib/shop/charge";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const incoming = (await req.json().catch(() => ({}))) as {
    codEnabled?: boolean;
    codAdvancePercent?: number;
    commissionPercent?: number;
  };
  const current = await getShopCheckoutConfig();
  if (incoming.codAdvancePercent != null && !Number.isInteger(incoming.codAdvancePercent)) {
    return NextResponse.json({ error: "COD advance must be a whole percent from 1 to 100" }, { status: 400 });
  }
  if (incoming.commissionPercent != null && !Number.isInteger(incoming.commissionPercent)) {
    return NextResponse.json({ error: "Commission must be a whole percent from 0 to 100" }, { status: 400 });
  }
  const next = {
    codEnabled: typeof incoming.codEnabled === "boolean" ? incoming.codEnabled : current.codEnabled,
    codAdvancePercent: incoming.codAdvancePercent ?? current.codAdvancePercent,
    commissionPercent: incoming.commissionPercent ?? current.commissionPercent
  };
  const problem = shopCheckoutError(next);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  await setShopCheckoutConfig(next, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "settings.shop.update",
    entity: "AppSetting",
    entityId: "shop",
    metadata: next,
    ip: getClientIp(req.headers)
  });
  return NextResponse.json(next);
}
