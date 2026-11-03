import type { ParsedEmail } from "../email-verify";
import { parseBankEmail } from "./bank-parser";

export type GmailConfig = { clientId: string; clientSecret: string; refreshToken: string };

function configuredDomains(filter: string): string[] {
  return filter.split(",").map((value) => value.trim().toLowerCase())
    .filter(Boolean).map((value) => value.includes("@") ? value.split("@").pop() || "" : value);
}

async function accessToken(cfg: GmailConfig): Promise<string> {
  if (!cfg.clientId || !cfg.clientSecret || !cfg.refreshToken) throw new Error("Connect Gmail in payment settings first.");
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: cfg.refreshToken,
    grant_type: "refresh_token"
  });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.access_token !== "string") {
    throw new Error("Gmail authorization expired. Reconnect the account.");
  }
  return result.access_token;
}

function decodePart(data: string | undefined): string {
  if (!data) return "";
  try { return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); }
  catch { return ""; }
}

function bodyText(payload: any): string {
  const found: string[] = [];
  const walk = (part: any) => {
    if (part?.mimeType === "text/plain" && part?.body?.data) found.push(decodePart(part.body.data));
    for (const child of part?.parts || []) walk(child);
  };
  walk(payload);
  if (found.length) return found.join("\n").slice(0, 30000);
  return decodePart(payload?.body?.data).slice(0, 30000);
}

function headersOf(payload: any, name: string): string[] {
  return (payload?.headers || []).filter((header: any) => String(header.name || "").toLowerCase() === name)
    .map((header: any) => String(header.value || ""));
}

async function gmailFetch(token: string, path: string) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { authorization: `Bearer ${token}` }, cache: "no-store"
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Could not read the connected Gmail inbox.");
  return json;
}

/** Fetch recent message metadata and content. Valid credit parsing is a separate pure step. */
export async function fetchRecentGmailPaymentEmails(cfg: GmailConfig, sinceMinutes = 1440, max = 60): Promise<ParsedEmail[]> {
  const token = await accessToken(cfg);
  const days = Math.max(1, Math.ceil(sinceMinutes / 1440));
  const list = await gmailFetch(token, `messages?maxResults=${Math.max(1, Math.min(100, max))}&q=${encodeURIComponent(`newer_than:${days}d`)}`);
  const rows = Array.isArray(list.messages) ? list.messages : [];
  const emails: ParsedEmail[] = [];
  for (const row of rows) {
    if (!row?.id) continue;
    const message = await gmailFetch(token, `messages/${encodeURIComponent(row.id)}?format=full`);
    const payload = message.payload || {};
    const headers = payload.headers || [];
    const find = (name: string) => headersOf(payload, name)[0] || "";
    const from = find("from");
    const dateHeader = find("date");
    const date = dateHeader ? new Date(dateHeader) : new Date(Number(message.internalDate) || Date.now());
    const email: ParsedEmail = {
      uid: String(message.id),
      messageId: find("message-id") || String(message.id),
      subject: find("subject"),
      from,
      fromAddress: from,
      text: bodyText(payload),
      date: Number.isFinite(date.getTime()) ? date : new Date(),
      authenticationResults: headersOf(payload, "authentication-results"),
      arcAuthenticationResults: headersOf(payload, "arc-authentication-results")
    };
    emails.push(email);
  }
  return emails;
}

export function parseGmailCredit(email: ParsedEmail, fromFilter: string) {
  return parseBankEmail({
    from: email.fromAddress || email.from,
    subject: email.subject,
    text: email.text,
    authenticationResults: email.authenticationResults,
    arcAuthenticationResults: email.arcAuthenticationResults
  }, configuredDomains(fromFilter));
}

export async function gmailConnectionTest(cfg: GmailConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const token = await accessToken(cfg);
    await gmailFetch(token, "profile");
    return { ok: true, message: "Gmail connected. Read-only access is working." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Gmail connection failed." };
  }
}
