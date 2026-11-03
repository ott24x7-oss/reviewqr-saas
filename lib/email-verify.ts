/**
 * IMAP inbox reader for payment auto-verification. Connects to the merchant's
 * mailbox (Gmail app-password or any IMAP provider), pulls recent
 * payment-confirmation emails, and returns their text so the reconciler can
 * match amount + reference against pending orders.
 */
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { assertSafeHost } from "./ssrf";
import { bankEmailDiagnostics, parseSenderAddress } from "./payments/bank-parser";

export type MailCfg = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromFilter: string; // comma-separated sender substrings
  trustedAuthservIds?: string[];
};

export type ParsedEmail = {
  uid: string;
  messageId: string;
  subject: string;
  from: string;
  fromAddress: string;
  text: string;
  date: Date;
  authenticationResults: string[];
  arcAuthenticationResults: string[];
};

function headerValues(source: Buffer, name: string): string[] {
  // Preserve the raw message order: the first Authentication-Results header is
  // the receiving server's result. Parsed header maps may group duplicates.
  const rawHeaders = source.toString("latin1").split(/\r?\n\r?\n/, 1)[0] || "";
  const unfolded = rawHeaders.replace(/\r?\n[ \t]+/g, " ");
  return unfolded.split(/\r?\n/).flatMap((line) => {
    const colon = line.indexOf(":");
    if (colon < 0 || line.slice(0, colon).trim().toLowerCase() !== name.toLowerCase()) return [];
    return [line.slice(colon + 1).trim()];
  });
}

function makeClient(cfg: MailCfg) {
  return new ImapFlow({
    host: cfg.host,
    port: cfg.port || 993,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false
  });
}

/** Confirm the mailbox credentials work. */
export async function testImap(cfg: MailCfg): Promise<{ ok: boolean; message: string }> {
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, message: "Fill in IMAP host, user and app-password first." };
  }
  try {
    await assertSafeHost(cfg.host, cfg.port);
  } catch (e: any) {
    return { ok: false, message: e?.message || "Invalid IMAP host" };
  }
  const client = makeClient(cfg);
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    lock.release();
    await client.logout();
    return { ok: true, message: `Connected to ${cfg.user} inbox.` };
  } catch (e: any) {
    try {
      await client.close();
    } catch {}
    return { ok: false, message: e?.message || "Connection failed" };
  }
}

/** Fetch recent emails (optionally filtered by sender) from the INBOX. */
export async function fetchRecentPaymentEmails(
  cfg: MailCfg,
  sinceMinutes = 1440,
  max = 60
): Promise<ParsedEmail[]> {
  if (!cfg.host || !cfg.user || !cfg.pass) return [];
  try {
    await assertSafeHost(cfg.host, cfg.port);
  } catch {
    return []; // refuse to connect to a private/reserved host
  }
  const senders = cfg.fromFilter
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  // Security: never scan an unrestricted mailbox. Without a sender allow-list,
  // any inbound email could be treated as a payment confirmation, so we refuse
  // to return candidates at all. Callers must configure mailFromFilter.
  if (!senders.length) return [];

  const client = makeClient(cfg);
  const out: ParsedEmail[] = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - sinceMinutes * 60_000);
      const uids = (await client.search({ since }, { uid: true })) as number[] | false;
      const list = Array.isArray(uids) ? uids.slice(-max) : [];
      if (list.length) {
        for await (const msg of client.fetch(list, { source: true }, { uid: true })) {
          try {
            const parsed = await simpleParser(msg.source as Buffer);
            const from = (parsed.from?.text || "").toLowerCase();
            const fromAddress = (parsed.from?.value?.[0]?.address || "").toLowerCase();
            const sender = parseSenderAddress(fromAddress);
            if (!sender) continue;
            const configuredDomains = senders.map((value) => value.includes("@") ? value.split("@").pop() || "" : value);
            const diagnostics = bankEmailDiagnostics({
              from: fromAddress,
              authenticationResults: headerValues(msg.source as Buffer, "authentication-results"),
              arcAuthenticationResults: headerValues(msg.source as Buffer, "arc-authentication-results")
            }, configuredDomains, cfg.trustedAuthservIds);
            if (!diagnostics.domainAllowed || !diagnostics.dkimAligned) continue;
            if (senders.length && !senders.some((s) => fromAddress.includes(s))) continue;
            const text = (parsed.text || parsed.html || "").toString();
            out.push({
              uid: String(msg.uid),
              messageId: parsed.messageId || String(msg.uid),
              subject: parsed.subject || "",
              from,
              fromAddress,
              text,
              date: parsed.date || new Date(),
              authenticationResults: headerValues(msg.source as Buffer, "authentication-results"),
              arcAuthenticationResults: headerValues(msg.source as Buffer, "arc-authentication-results")
            });
          } catch {
            // skip unparseable message
          }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch {
    try {
      await client.close();
    } catch {}
  }
  return out;
}
