import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { otpRequestSchema, otpVerifySchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { otpRequestBody } from "@/lib/auth/dev-otp";
import { confirmPhoneChange, phoneKey, requestPhoneChange } from "@/lib/otp";
import { enforceOtpLimits, otpIpLimits, otpLimitMessage, otpPhoneLimits, OTP_RESEND_AFTER_SEC } from "@/lib/otp-message";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
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
  const result = await requestPhoneChange(auth.user.id, parsed.data.phone);
  if (!result.ok) return v1Error(400, "VALIDATION", result.error);
  return v1Data(
    otpRequestBody(result.issuedCode, process.env, {
      channel: result.channel === "none" ? "whatsapp" : result.channel,
      resendAfterSec: OTP_RESEND_AFTER_SEC,
      message: "Enter the code sent to the new number"
    })
  );
}

async function putHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, otpVerifySchema);
  if (!parsed.ok) return parsed.response;
  const result = await confirmPhoneChange(auth.user.id, parsed.data.phone, parsed.data.code);
  if (!result.ok) return v1Error(400, "VALIDATION", result.error);
  return v1Data({ phone: result.phone });
}
export const POST = observe(postHandler);
export const PUT = observe(putHandler);
