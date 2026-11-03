import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getPaymentsConfig, setPaymentsConfig } from "@/lib/settings";
import { verifyGmailOAuthState } from "@/lib/payments/gmail-oauth";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const code = req.nextUrl.searchParams.get("code") || "";
  const state = req.nextUrl.searchParams.get("state") || "";
  const origin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : req.nextUrl.origin;
  const back = new URL("/admin/payments", origin);
  if (!code || !verifyGmailOAuthState(state, guard.user.id)) {
    back.searchParams.set("gmail", "failed");
    return NextResponse.redirect(back);
  }
  const cfg = await getPaymentsConfig();
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.gmailClientId,
        client_secret: cfg.gmailClientSecret,
        redirect_uri: `${origin}/api/admin/settings/payments/gmail/callback`,
        grant_type: "authorization_code"
      }),
      cache: "no-store"
    });
    const result = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || typeof result.refresh_token !== "string") throw new Error("Missing refresh token");
    await setPaymentsConfig({ ...cfg, gmailRefreshToken: result.refresh_token }, guard.user.id);
    back.searchParams.set("gmail", "connected");
  } catch {
    back.searchParams.set("gmail", "failed");
  }
  return NextResponse.redirect(back);
}
