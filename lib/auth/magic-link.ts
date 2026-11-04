import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { phoneKeyFromRaw } from "../otp-message";

export const MAGIC_LINK_KEYWORD = "Login with Magic Link for QR24x7";
export const SIGNUP_MAGIC_LINK_KEYWORD = "Sign up for QR24x7";
export const MAGIC_LINK_TTL_MS = 10 * 60 * 1000;
export const MAGIC_LINK_RATE_LIMIT = 3;
export const MAGIC_LINK_RATE_WINDOW_SECONDS = 10 * 60;

export function normalizeMagicLinkText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function plainTextFromMessage(message: any): string | null {
  let current = message;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (typeof current.conversation === "string") return current.conversation;
    if (typeof current.extendedTextMessage?.text === "string") return current.extendedTextMessage.text;
    current = current.ephemeralMessage?.message;
  }
  return null;
}

function phonePart(value: unknown) {
  if (typeof value !== "string") return "";
  const candidate = value.trim().split("@")[0].split(":")[0];
  const digits = candidate.replace(/\D/g, "");
  return digits.length >= 10 ? digits : "";
}

function messageTimestampSeconds(value: unknown): number | null {
  let timestamp = value;
  if (typeof timestamp === "object" && timestamp !== null) {
    const toNumber = (timestamp as { toNumber?: unknown }).toNumber;
    if (typeof toNumber === "function") {
      try {
        timestamp = toNumber.call(timestamp);
      } catch {
        return null;
      }
    }
  }
  if (typeof timestamp === "string") {
    if (!timestamp.trim()) return null;
    timestamp = Number(timestamp);
  }
  return typeof timestamp === "number" && Number.isFinite(timestamp) ? timestamp : null;
}

export function phoneFromWhatsAppJid(remoteJid: unknown, senderPn?: unknown, participantPn?: unknown) {
  if (typeof remoteJid !== "string") return "";
  if (remoteJid.endsWith("@s.whatsapp.net")) return phonePart(remoteJid);
  if (remoteJid.endsWith("@lid")) return phonePart(senderPn) || phonePart(participantPn);
  return "";
}

export type MagicMessageDecision =
  | { kind: "ignore" }
  | { kind: "missing-phone"; replyTo: string }
  | { kind: "login" | "signup"; phone: string; replyTo: string };

/** Parses only notify events containing an exact auth keyword in a 1:1 text chat. */
export function decideMagicLinkMessage(upsertType: unknown, message: any, now = Date.now()): MagicMessageDecision {
  const key = message?.key;
  const remoteJid = key?.remoteJid;
  if (upsertType !== "notify" || !key || key.fromMe === true || typeof remoteJid !== "string") {
    return { kind: "ignore" };
  }
  if (
    remoteJid === "status@broadcast" ||
    /@(g\.us|broadcast|newsletter)$/.test(remoteJid) ||
    !/@(s\.whatsapp\.net|lid)$/.test(remoteJid)
  ) {
    return { kind: "ignore" };
  }

  const timestamp = messageTimestampSeconds(message.messageTimestamp);
  if (timestamp !== null && timestamp * 1000 < now - MAGIC_LINK_TTL_MS) {
    return { kind: "ignore" };
  }

  const text = plainTextFromMessage(message.message);
  if (text === null) {
    return { kind: "ignore" };
  }
  const normalizedText = normalizeMagicLinkText(text);
  const kind =
    normalizedText === normalizeMagicLinkText(MAGIC_LINK_KEYWORD)
      ? "login"
      : normalizedText === normalizeMagicLinkText(SIGNUP_MAGIC_LINK_KEYWORD)
        ? "signup"
        : null;
  if (!kind) return { kind: "ignore" };

  const phone = phoneFromWhatsAppJid(remoteJid, key.senderPn, key.participantPn);
  return phone ? { kind, phone, replyTo: remoteJid } : { kind: "missing-phone", replyTo: remoteJid };
}

export function createMagicLinkSecret(now = Date.now(), bytes = randomBytes(32)) {
  const token = bytes.toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash, expiresAt: new Date(now + MAGIC_LINK_TTL_MS) };
}

export function magicLinkHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function magicLinkHashMatches(expectedHash: string, token: string) {
  const actual = Buffer.from(magicLinkHash(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function magicLinkUsable(
  row: { tokenHash: string; expiresAt: Date; usedAt: Date | null } | null,
  token: string,
  now = Date.now()
) {
  return Boolean(
    token &&
      row &&
      row.usedAt === null &&
      row.expiresAt.getTime() > now &&
      magicLinkHashMatches(row.tokenHash, token)
  );
}

export function magicLinkRateLimitAllowed(countInWindow: number, limit = MAGIC_LINK_RATE_LIMIT) {
  return countInWindow <= limit;
}

export function magicLinkRequestPhone(rawPhone: string) {
  return phoneKeyFromRaw(rawPhone);
}
