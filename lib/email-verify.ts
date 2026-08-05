/**
 * IMAP inbox reader for payment auto-verification. Connects to the merchant's
 * mailbox (Gmail app-password or any IMAP provider), pulls recent
 * payment-confirmation emails, and returns their text so the reconciler can
 * match amount + reference against pending orders.
 */
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type MailCfg = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromFilter: string; // comma-separated sender substrings
};

export type ParsedEmail = {
  uid: string;
  messageId: string;
  subject: string;
  from: string;
  text: string;
  date: Date;
};

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
            if (senders.length && !senders.some((s) => from.includes(s))) continue;
            const text = (parsed.text || parsed.html || "").toString();
            out.push({
              uid: String(msg.uid),
              messageId: parsed.messageId || String(msg.uid),
              subject: parsed.subject || "",
              from,
              text,
              date: parsed.date || new Date()
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
