import { NextRequest, NextResponse } from "next/server";
import { devOtpCode } from "@/lib/auth/dev-otp";
import { runSignupOtp } from "@/lib/auth/signup-otp";
import {
  enforceOtpLimits,
  isSignupRequest,
  otpIpLimits,
  otpLimitMessage,
  otpPhoneLimits,
  OTP_RESEND_AFTER_SEC,
  phoneKeyFromBody
} from "@/lib/otp-message";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipLimit = await enforceOtpLimits(otpIpLimits(ip, "signup"), rateLimitDb);
  if (!ipLimit.ok) return NextResponse.json({ error: otpLimitMessage(ipLimit.key) }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const phone = phoneKeyFromBody(body);
  if (phone && isSignupRequest(body)) {
    const phoneLimit = await enforceOtpLimits(otpPhoneLimits(phone), rateLimitDb);
    if (!phoneLimit.ok) return NextResponse.json({ error: otpLimitMessage(phoneLimit.key) }, { status: 429 });
  }
  const result = await runSignupOtp(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (result.kind === "request") {
    const devCode = devOtpCode(result.issuedCode);
    return NextResponse.json({
      ok: true,
      channel: result.channel,
      resendAfterSec: OTP_RESEND_AFTER_SEC,
      ...(devCode ? { devCode } : {})
    });
  }
  if (result.kind === "confirm") return NextResponse.json({ ok: true, signupToken: result.signupToken });
  return NextResponse.json({ ok: true, otpToken: result.otpToken });
}
