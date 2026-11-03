import { observe } from "@/lib/api/observe";
import { parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { emailIsConfigured } from "@/lib/email";
import { emailOtpLimits, emailOtpRequestBody, normalizeEmail } from "@/lib/email-otp";
import { requestEmailLoginOtp } from "@/lib/otp";
import { enforceOtpLimits, otpIpLimits, otpLimitMessage } from "@/lib/otp-message";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(320).transform(normalizeEmail)
});

async function postHandler(req: NextRequest) {
  const parsed = await parseJson(req, schema);
  if (!parsed.ok) return parsed.response;

  if (!(await emailIsConfigured())) {
    return v1Error(503, "EMAIL_NOT_CONFIGURED", "Email sign-in is unavailable because email delivery is not configured.");
  }

  const ipLimit = await enforceOtpLimits(otpIpLimits(getClientIp(req.headers), "login"), rateLimitDb);
  if (!ipLimit.ok) return v1Error(429, "RATE_LIMIT", otpLimitMessage(ipLimit.key));
  const emailLimit = await enforceOtpLimits(emailOtpLimits(parsed.data.email), rateLimitDb);
  if (!emailLimit.ok) return v1Error(429, "RATE_LIMIT", otpLimitMessage(emailLimit.key));

  const result = await requestEmailLoginOtp(parsed.data.email);
  return v1Data(emailOtpRequestBody(result.accountExists));
}

export const POST = observe(postHandler);
