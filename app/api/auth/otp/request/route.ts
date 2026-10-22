import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { devOtpCode } from "@/lib/auth/dev-otp";
import { enforceOtpLimits, LOGIN_OTP_NOTICE, otpIpLimits, otpLimitMessage, otpPhoneLimits, OTP_RESEND_AFTER_SEC } from "@/lib/otp-message";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { phoneKey, preferredOtpChannel, requestLoginOtp } from "@/lib/otp";

const schema = z.object({ phone: z.string().min(10).max(20) });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipLimit = await enforceOtpLimits(otpIpLimits(ip, "login"), rateLimitDb);
  if (!ipLimit.ok) return NextResponse.json({ error: otpLimitMessage(ipLimit.key) }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });

  const key = phoneKey(parsed.data.phone);
  if (key) {
    const phoneLimit = await enforceOtpLimits(otpPhoneLimits(key), rateLimitDb);
    if (!phoneLimit.ok) return NextResponse.json({ error: otpLimitMessage(phoneLimit.key) }, { status: 429 });
  }

  const result = await requestLoginOtp(parsed.data.phone);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const channel = await preferredOtpChannel();
  const devCode = result.issuedCode ? devOtpCode(result.issuedCode) : undefined;
  return NextResponse.json({
    ok: true,
    channel,
    resendAfterSec: OTP_RESEND_AFTER_SEC,
    message: LOGIN_OTP_NOTICE,
    ...(devCode ? { devCode } : {})
  });
}
