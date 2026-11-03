import { observe } from "@/lib/api/observe";
import { deviceMeta, parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { tokenConfigError, issueTokenPair } from "@/lib/auth/sessions";
import { normalizeEmail } from "@/lib/email-otp";
import { createOtpSession, verifyEmailLoginOtp } from "@/lib/otp";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(320).transform(normalizeEmail),
  code: z.string().trim().max(32),
  mode: z.enum(["web", "mobile"]).default("mobile"),
  deviceName: z.string().max(100).optional()
});

async function postHandler(req: NextRequest) {
  const parsed = await parseJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const ip = getClientIp(req.headers);
  const [ipLimit, emailLimit] = await Promise.all([
    rateLimitDb({ key: `email-otp-verify-ip:${ip}`, limit: 8, windowSeconds: 600 }),
    rateLimitDb({ key: `email-otp-verify:${parsed.data.email}`, limit: 8, windowSeconds: 600 })
  ]);
  if (!ipLimit.ok || !emailLimit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");

  if (parsed.data.mode === "mobile" && tokenConfigError()) {
    return v1Error(500, "INTERNAL", "AUTH_TOKEN_SECRET is not set");
  }

  const verified = await verifyEmailLoginOtp(parsed.data.email, parsed.data.code);
  if (!verified.ok) return v1Error(401, "UNAUTHORIZED", verified.error);

  if (parsed.data.mode === "web") {
    const otpToken = await createOtpSession(verified.user.id);
    return v1Data({ otpToken, path: verified.user.role === "ADMIN" ? "/admin" : "/dashboard" });
  }

  const tokens = await issueTokenPair(
    { id: verified.user.id, role: verified.user.role },
    deviceMeta(req, parsed.data.deviceName || "Android")
  );
  return v1Data(tokens);
}

export const POST = observe(postHandler);
