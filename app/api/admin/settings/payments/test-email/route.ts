import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getPaymentsConfig } from "@/lib/settings";
import { testImap } from "@/lib/email-verify";

/** Test the IMAP mailbox connection used for payment auto-verification. */
export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => ({}))) as any;
  const stored = await getPaymentsConfig();
  const cfg = {
    host: String(body.mailImapHost || stored.mailImapHost).trim(),
    port: Number(body.mailImapPort) || stored.mailImapPort || 993,
    user: String(body.mailImapUser || stored.mailImapUser).trim(),
    pass:
      typeof body.mailImapPass === "string" && body.mailImapPass.trim()
        ? body.mailImapPass.trim()
        : stored.mailImapPass,
    fromFilter: ""
  };

  const result = await testImap(cfg);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
