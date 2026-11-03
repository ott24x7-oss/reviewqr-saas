import { fetchRecentPaymentEmails } from "./email-verify";
import { getPaymentsConfig } from "./settings";
import { BANK_EMAIL_DOMAINS, parseBankEmail, parseSenderAddress } from "./payments/bank-parser";
import { fetchRecentGmailPaymentEmails } from "./payments/gmail";
import { bankMessageHash, matchAllUnclaimedBankCredits, recordBankCredit } from "./bank-credit-ledger";

function senderAllowFilter(configured: string) {
  return [...new Set([...BANK_EMAIL_DOMAINS, ...configured.split(",").map((value) => value.trim()).filter(Boolean)])].join(",");
}

async function importEmails(
  source: "imap" | "gmail",
  emails: Awaited<ReturnType<typeof fetchRecentPaymentEmails>>,
  configuredFilter: string,
  trustedAuthservIds: string[]
) {
  let imported = 0;
  for (const email of emails) {
    const parsed = parseBankEmail({
      from: email.fromAddress || email.from,
      subject: email.subject,
      text: email.text,
      authenticationResults: email.authenticationResults,
      arcAuthenticationResults: email.arcAuthenticationResults
    }, configuredFilter.split(",").map((value) => value.trim()).filter(Boolean), trustedAuthservIds);
    const sender = parseSenderAddress(email.fromAddress || email.from);
    if (!parsed || !sender) continue;
    const identity = email.messageId || `${sender.address}:${email.date.toISOString()}:${email.subject}`;
    const bodyExcerpt = `${email.subject}\n${email.text}`.replace(/\s+/g, " ").trim().slice(0, 1200);
    const result = await recordBankCredit({
      source,
      amountPaise: parsed.amountPaise,
      utr: parsed.utr,
      payerName: parsed.payerName,
      sender: sender.address,
      receivedAt: email.date,
      rawHash: bankMessageHash(`bank-email:${identity}`),
      bodyExcerpt
    });
    if (!result.duplicate) imported++;
  }
  return imported;
}

export async function syncIncomingBankCredits() {
  const cfg = await getPaymentsConfig();
  let imapImported = 0;
  let gmailImported = 0;
  const filter = senderAllowFilter(cfg.mailFromFilter);

  if (cfg.mailVerifyEnabled && cfg.mailImapUser && cfg.mailImapPass) {
    const emails = await fetchRecentPaymentEmails({
      host: cfg.mailImapHost,
      port: cfg.mailImapPort,
      user: cfg.mailImapUser,
      pass: cfg.mailImapPass,
      fromFilter: filter,
      trustedAuthservIds: cfg.mailTrustedAuthservIds.split(",").map((value) => value.trim()).filter(Boolean)
    }, 1440, 80);
    imapImported = await importEmails("imap", emails, cfg.mailFromFilter, cfg.mailTrustedAuthservIds.split(",").map((value) => value.trim()).filter(Boolean));
  }

  if (cfg.mailVerifyEnabled && cfg.gmailClientId && cfg.gmailClientSecret && cfg.gmailRefreshToken) {
    const emails = await fetchRecentGmailPaymentEmails({
      clientId: cfg.gmailClientId,
      clientSecret: cfg.gmailClientSecret,
      refreshToken: cfg.gmailRefreshToken
    }, 1440, 80);
    gmailImported = await importEmails("gmail", emails, cfg.mailFromFilter, cfg.mailTrustedAuthservIds.split(",").map((value) => value.trim()).filter(Boolean));
  }

  const matched = await matchAllUnclaimedBankCredits();
  return { imapImported, gmailImported, ...matched };
}
