/**
 * Admin "log in as user" cookie.
 * AES-GCM with a key derived from NEXTAUTH_SECRET. The NextAuth session
 * stays the admin. The cookie is checked only when that session user is
 * an ADMIN and their id is the impersonatorId. It expires 30 minutes from
 * issue and is not refreshed on later requests.
 */
import crypto from "crypto";

export const IMPERSONATION_COOKIE = "rq_impersonate";
export const IMPERSONATION_TTL_MS = 30 * 60 * 1000;
export const IMPERSONATION_MAX_AGE_SEC = 30 * 60;

export type ImpersonationPayload = {
  impersonatorId: string;
  targetUserId: string;
  exp: number;
};

function key() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required");
  return crypto.createHash("sha256").update(secret).digest();
}

export function sealImpersonation(
  input: { impersonatorId: string; targetUserId: string },
  now = Date.now()
) {
  const payload: ImpersonationPayload = {
    impersonatorId: input.impersonatorId,
    targetUserId: input.targetUserId,
    exp: now + IMPERSONATION_TTL_MS
  };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function openImpersonation(token: string, now = Date.now()): ImpersonationPayload | null {
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 12 + 16 + 2) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    const payload = JSON.parse(json) as ImpersonationPayload;
    if (!payload.impersonatorId || !payload.targetUserId || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** The cookie is ignored unless the live session is that admin. */
export function impersonationAllowed(
  session: { id: string; role: string },
  payload: ImpersonationPayload | null,
  now = Date.now()
) {
  if (!payload) return false;
  if (session.role !== "ADMIN") return false;
  if (session.id !== payload.impersonatorId) return false;
  if (payload.targetUserId === session.id) return false;
  if (payload.exp <= now) return false;
  return true;
}

export function canImpersonateTarget(role: string) {
  return role !== "ADMIN";
}

export function impersonationCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: IMPERSONATION_MAX_AGE_SEC
  };
}
