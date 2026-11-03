import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { gmailConnectionTest } from "@/lib/payments/gmail";
import { getPaymentsConfig } from "@/lib/settings";

export async function POST() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const cfg = await getPaymentsConfig();
  const result = await gmailConnectionTest({ clientId: cfg.gmailClientId, clientSecret: cfg.gmailClientSecret, refreshToken: cfg.gmailRefreshToken });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
