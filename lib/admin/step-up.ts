import crypto from "crypto";
import type { AdminStepUpAction } from "@reviewqr/shared";
import { STEP_UP_TTL_SEC, signAccessToken } from "@/lib/auth/access-token";
import { prisma } from "@/lib/db";
import { requestPurposeOtp, verifyPurposeOtp } from "@/lib/otp";
import { rateLimitDb } from "@/lib/rate-limit";

const PURPOSE = "admin-step-up";

export async function sendAdminStepUp(userId: string) {
  const limit = await rateLimitDb({ key: `admin-step:${userId}`, limit: 5, windowSeconds: 600 });
  if (!limit.ok) return { ok: false as const, status: 429, error: "Too many attempts" };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, email: true, role: true, deletedAt: true, suspendedAt: true }
  });
  if (!user || user.deletedAt || user.suspendedAt || user.role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "Admin access only" };
  }
  if (!user.phone) return { ok: false as const, status: 400, error: "Add a phone number on the web first" };
  const sent = await requestPurposeOtp({
    identifier: user.id,
    phone: user.phone,
    purpose: PURPOSE,
    email: user.email
  });
  if (!sent.ok) return { ok: false as const, status: 400, error: sent.error };
  return { ok: true as const, issuedCode: sent.issuedCode };
}

/** The token is bound to one action and carries a jti, so the guard can spend it once. */
export async function consumeAdminStepUp(userId: string, deviceId: string, code: string, action: AdminStepUpAction) {
  const checked = await verifyPurposeOtp(userId, PURPOSE, code);
  if (!checked.ok) return { ok: false as const, status: 400, error: "Invalid code" };
  const stepUpToken = signAccessToken(
    { sub: userId, role: "ADMIN", aud: "admin-step-up", deviceId, act: action, jti: crypto.randomUUID() },
    undefined,
    undefined,
    STEP_UP_TTL_SEC
  );
  return { ok: true as const, stepUpToken, expiresIn: STEP_UP_TTL_SEC };
}
