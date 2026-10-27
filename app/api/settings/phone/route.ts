import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { revokeOtherRefreshSessions } from "@/lib/auth/sessions";
import { findUserByPhone, phoneKey, requestPurposeOtp, verifyPurposeOtp } from "@/lib/otp";
import { enforceOtpLimits, otpLimitMessage, otpPhoneLimits, OTP_RESEND_AFTER_SEC } from "@/lib/otp-message";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

const requestSchema = z.object({
  action: z.literal("request"),
  phone: z.string().min(10).max(20)
});

const verifySchema = z.object({
  action: z.literal("verify"),
  phone: z.string().min(10).max(20),
  code: z.string().regex(/^\d{6}$/)
});

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimitDb({ key: `otp-phone-change:${ip}`, limit: 8, windowSeconds: 600 });
  if (!ipLimit.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  if (body?.action === "request") {
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });
    const key = phoneKey(parsed.data.phone);
    if (!key) return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });
    if (key === phoneKey(user.phone || "")) {
      return NextResponse.json({ error: "That is already your WhatsApp number" }, { status: 400 });
    }
    const owner = await findUserByPhone(key);
    if (owner && owner.id !== user.id) {
      return NextResponse.json({ error: "That number is already used" }, { status: 409 });
    }
    const phoneLimit = await enforceOtpLimits(otpPhoneLimits(key), rateLimitDb);
    if (!phoneLimit.ok) return NextResponse.json({ error: otpLimitMessage(phoneLimit.key) }, { status: 429 });
    const sent = await requestPurposeOtp({
      identifier: `${user.id}:${key}`,
      phone: key,
      purpose: "phone-change",
      email: null
    });
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 503 });
    return NextResponse.json({
      ok: true,
      channel: sent.channel,
      resendAfterSec: OTP_RESEND_AFTER_SEC
    });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  const key = phoneKey(parsed.data.phone);
  if (!key) return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });
  const owner = await findUserByPhone(key);
  if (owner && owner.id !== user.id) {
    return NextResponse.json({ error: "That number is already used" }, { status: 409 });
  }
  const checked = await verifyPurposeOtp(`${user.id}:${key}`, "phone-change", parsed.data.code);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { phone: key } });
  await revokeOtherRefreshSessions(user.id);
  return NextResponse.json({ ok: true, phone: key });
}
