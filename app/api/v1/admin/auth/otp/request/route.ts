import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { otpRequestSchema } from "@reviewqr/shared";
import { parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { otpRequestBody } from "@/lib/auth/dev-otp";
import { requestAdminOtp } from "@/lib/admin/otp";
import { enforceOtpLimits, LOGIN_OTP_NOTICE, otpIpLimits, otpLimitMessage, otpPhoneLimits, OTP_RESEND_AFTER_SEC } from "@/lib/otp-message";
import { phoneKey, preferredOtpChannel } from "@/lib/otp";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipLimit = await enforceOtpLimits(otpIpLimits(ip, "login"), rateLimitDb);
  if (!ipLimit.ok) return v1Error(429, "RATE_LIMIT", otpLimitMessage(ipLimit.key));

  const parsed = await parseJson(req, otpRequestSchema);
  if (!parsed.ok) return parsed.response;

  const key = phoneKey(parsed.data.phone);
  if (key) {
    const phoneLimit = await enforceOtpLimits(otpPhoneLimits(key), rateLimitDb);
    if (!phoneLimit.ok) return v1Error(429, "RATE_LIMIT", otpLimitMessage(phoneLimit.key));
  }

  const result = await requestAdminOtp(parsed.data.phone);
  if (!result.ok) return v1Error(400, "VALIDATION", result.error);
  const channel = await preferredOtpChannel();
  return v1Data(
    otpRequestBody(result.issuedCode, process.env, {
      channel,
      resendAfterSec: OTP_RESEND_AFTER_SEC,
      message: LOGIN_OTP_NOTICE
    })
  );
}
export const POST = observe(postHandler);
