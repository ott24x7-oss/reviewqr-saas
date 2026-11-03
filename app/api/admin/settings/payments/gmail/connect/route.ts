import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getPaymentsConfig } from "@/lib/settings";
import { createGmailOAuthState } from "@/lib/payments/gmail-oauth";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const cfg = await getPaymentsConfig();
  if (!cfg.gmailClientId || !cfg.gmailClientSecret) {
    return NextResponse.json({ error: "Enter the Gmail OAuth client ID and secret, then save settings." }, { status: 400 });
  }
  const origin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : req.nextUrl.origin;
  const redirectUri = `${origin}/api/admin/settings/payments/gmail/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: cfg.gmailClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: createGmailOAuthState(guard.user.id)
  }).toString();
  return NextResponse.redirect(url);
}
