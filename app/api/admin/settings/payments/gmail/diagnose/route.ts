import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { fetchRecentPaymentEmails } from "@/lib/email-verify";
import { fetchRecentGmailPaymentEmails } from "@/lib/payments/gmail";
import { BANK_EMAIL_DOMAINS, bankEmailDiagnostics, parseBankEmail, parseSenderAddress } from "@/lib/payments/bank-parser";
import { getPaymentsConfig } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const cfg = await getPaymentsConfig();
  const source = req.nextUrl.searchParams.get("source") === "gmail" ? "gmail" : "imap";
  const configured = cfg.mailFromFilter.split(",").map((item) => item.trim()).filter(Boolean);
  let emails;
  try {
    if (source === "gmail") {
      emails = await fetchRecentGmailPaymentEmails({ clientId: cfg.gmailClientId, clientSecret: cfg.gmailClientSecret, refreshToken: cfg.gmailRefreshToken }, 1440, 40);
    } else {
      const filter = [...new Set([...BANK_EMAIL_DOMAINS, ...configured])].join(",");
      emails = await fetchRecentPaymentEmails({ host: cfg.mailImapHost, port: cfg.mailImapPort, user: cfg.mailImapUser, pass: cfg.mailImapPass, fromFilter: filter }, 1440, 40);
    }
    const rows = emails.map((email) => {
      const input = { from: email.fromAddress || email.from, subject: email.subject, text: email.text, authenticationResults: email.authenticationResults, arcAuthenticationResults: email.arcAuthenticationResults };
      const diagnostics = bankEmailDiagnostics(input, configured);
      const parsed = parseBankEmail(input, configured);
      return {
        date: email.date.toISOString(),
        from: parseSenderAddress(email.fromAddress || email.from)?.address || "Unknown sender",
        subject: email.subject.slice(0, 160),
        domainAllowed: diagnostics.domainAllowed,
        dkim: diagnostics.dkimAligned ? "pass" : "fail",
        amountPaise: parsed?.amountPaise ?? null,
        utr: parsed?.utr ?? null,
        accepted: !!parsed
      };
    }).filter((row) => row.domainAllowed).slice(0, 20);
    return NextResponse.json({ source, emails: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not diagnose this inbox." }, { status: 400 });
  }
}
