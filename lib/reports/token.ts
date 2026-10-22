import crypto from "crypto";

/** Unsubscribe links stay valid for 90 days from the time they were issued. */
export const REPORT_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
/** A few minutes of clock skew does not reject a freshly issued link. */
export const REPORT_TOKEN_SKEW_MS = 5 * 60 * 1000;

function reportSecret() {
  const next = process.env.NEXTAUTH_SECRET;
  if (next) return next;
  const auth = process.env.AUTH_TOKEN_SECRET;
  if (auth) return auth;
  return null;
}

function sign(secret: string, userId: string, issuedAt: number) {
  return crypto.createHmac("sha256", secret).update(`report|${userId}|${issuedAt}`).digest("hex").slice(0, 32);
}

/** `userId.issuedAt.hmac`. Throws when neither token secret is configured. */
export function reportToken(userId: string, now = new Date()) {
  const secret = reportSecret();
  if (!secret) throw new Error("Report token secret is not configured");
  const issuedAt = Math.floor(now.getTime() / 1000);
  return `${userId}.${issuedAt}.${sign(secret, userId, issuedAt)}`;
}

/** Returns the user id, or null when the token is missing, forged, future, or older than 90 days. */
export function readReportToken(token: string, now = new Date()) {
  const secret = reportSecret();
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length < 3) return null;
  const sig = parts.pop() || "";
  const issuedRaw = parts.pop() || "";
  const userId = parts.join(".");
  if (!userId || !/^\d+$/.test(issuedRaw)) return null;
  const issuedAt = Number(issuedRaw);
  if (!Number.isSafeInteger(issuedAt)) return null;
  const expected = sign(secret, userId, issuedAt);
  if (sig.length !== expected.length) return null;
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (!crypto.timingSafeEqual(left, right)) return null;
  const issuedMs = issuedAt * 1000;
  if (issuedMs > now.getTime() + REPORT_TOKEN_SKEW_MS) return null;
  if (now.getTime() - issuedMs > REPORT_TOKEN_TTL_MS) return null;
  return userId;
}
