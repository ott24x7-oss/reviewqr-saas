import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { codeForStatus } from "@/lib/api/result";
import { deviceMeta, v1Data, v1Error } from "@/lib/api/v1";
import { otpRequestBody } from "@/lib/auth/dev-otp";
import { tokenConfigError, issueTokenPair } from "@/lib/auth/sessions";
import { runSignupOtp } from "@/lib/auth/signup-otp";
import { consumeOtpSession } from "@/lib/otp";
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

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipLimit = await enforceOtpLimits(otpIpLimits(ip, "signup"), rateLimitDb);
  if (!ipLimit.ok) return v1Error(429, "RATE_LIMIT", otpLimitMessage(ipLimit.key));

  const body = await req.json().catch(() => ({}));
  const phone = phoneKeyFromBody(body);
  if (phone && isSignupRequest(body)) {
    const phoneLimit = await enforceOtpLimits(otpPhoneLimits(phone), rateLimitDb);
    if (!phoneLimit.ok) return v1Error(429, "RATE_LIMIT", otpLimitMessage(phoneLimit.key));
  }
  const result = await runSignupOtp(body);
  if (!result.ok) return v1Error(result.status, codeForStatus(result.status), result.error);

  if (result.kind === "request") {
    return v1Data(
      otpRequestBody(result.issuedCode, process.env, {
        channel: result.channel,
        resendAfterSec: OTP_RESEND_AFTER_SEC
      })
    );
  }
  if (result.kind === "confirm") return v1Data({ signupToken: result.signupToken });

  const user = await consumeOtpSession(result.otpToken);
  if (!user) return v1Error(401, "UNAUTHORIZED", "Invalid code");
  if (tokenConfigError()) return v1Error(500, "INTERNAL", "AUTH_TOKEN_SECRET is not set");
  const tokens = await issueTokenPair({ id: user.id, role: user.role }, deviceMeta(req, result.deviceName));
  return v1Data(tokens);
}

export const POST = observe(postHandler);
