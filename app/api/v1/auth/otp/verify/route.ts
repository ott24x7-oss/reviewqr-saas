import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { otpVerifySchema } from "@reviewqr/shared";
import { deviceMeta, parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { tokenConfigError, issueTokenPair } from "@/lib/auth/sessions";
import { consumeOtpSession, phoneKey, verifyLoginOtp } from "@/lib/otp";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimitDb({ key: `otp-verify:${ip}`, limit: 8, windowSeconds: 600 });
  if (!ipLimit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");

  const parsed = await parseJson(req, otpVerifySchema);
  if (!parsed.ok) return parsed.response;

  const key = phoneKey(parsed.data.phone);
  if (key) {
    const phoneLimit = await rateLimitDb({ key: `otp-verify-phone:${key}`, limit: 8, windowSeconds: 600 });
    if (!phoneLimit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");
  }

  const verified = await verifyLoginOtp(parsed.data.phone, parsed.data.code);
  if (!verified.ok) return v1Error(401, "UNAUTHORIZED", "Invalid code");

  const user = await consumeOtpSession(verified.otpToken);
  if (!user) return v1Error(401, "UNAUTHORIZED", "Invalid code");

  if (tokenConfigError()) return v1Error(500, "INTERNAL", "AUTH_TOKEN_SECRET is not set");
  const tokens = await issueTokenPair(
    { id: user.id, role: user.role },
    deviceMeta(req, parsed.data.deviceName)
  );
  return v1Data(tokens);
}
export const POST = observe(postHandler);
