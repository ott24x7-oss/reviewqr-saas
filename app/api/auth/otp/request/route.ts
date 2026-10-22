import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { devOtpCode } from "@/lib/auth/dev-otp";
import { LOGIN_OTP_NOTICE, OTP_RESEND_AFTER_SEC } from "@/lib/otp-message";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { phoneKey, preferredOtpChannel, requestLoginOtp } from "@/lib/otp";

const schema = z.object({ phone: z.string().min(10).max(20) });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimitDb({ key: `otp-req:${ip}`, limit: 8, windowSeconds: 600 });
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid mobile number" }, { status: 400 });

  const key = phoneKey(parsed.data.phone);
  if (key) {
    const perPhone = await rateLimitDb({ key: `otp-phone:${key}`, limit: 5, windowSeconds: 600 });
    if (!perPhone.ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
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
