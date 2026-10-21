import { NextRequest } from "next/server";
import { otpRequestSchema } from "@reviewqr/shared";
import { parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { otpRequestBody } from "@/lib/auth/dev-otp";
import { phoneKey, requestLoginOtp } from "@/lib/otp";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ipLimit = await rateLimitDb({ key: `otp-req:${ip}`, limit: 8, windowSeconds: 600 });
  if (!ipLimit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");

  const parsed = await parseJson(req, otpRequestSchema);
  if (!parsed.ok) return parsed.response;

  const key = phoneKey(parsed.data.phone);
  if (key) {
    const phoneLimit = await rateLimitDb({ key: `otp-phone:${key}`, limit: 5, windowSeconds: 600 });
    if (!phoneLimit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");
  }

  const result = await requestLoginOtp(parsed.data.phone);
  if (!result.ok) return v1Error(400, "VALIDATION", result.error);
  return v1Data(otpRequestBody(result.issuedCode));
}
