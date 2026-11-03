import { observe } from "@/lib/api/observe";
import { deviceMeta, parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { tokenConfigError, issueTokenPair } from "@/lib/auth/sessions";
import { consumeMagicLink } from "@/lib/auth/magic-link-service";
import { createOtpSession } from "@/lib/otp";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(43).max(43),
  mode: z.enum(["web", "mobile"]).default("mobile"),
  deviceName: z.string().max(100).optional()
});

async function postHandler(req: NextRequest) {
  const ipLimit = await rateLimitDb({ key: `magic-link-verify:${getClientIp(req.headers)}`, limit: 8, windowSeconds: 600 });
  if (!ipLimit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");

  const parsed = await parseJson(req, schema);
  if (!parsed.ok) return parsed.response;
  if (parsed.data.mode === "mobile" && tokenConfigError()) {
    return v1Error(500, "INTERNAL", "AUTH_TOKEN_SECRET is not set");
  }

  const user = await consumeMagicLink(parsed.data.token);
  if (!user) return v1Error(401, "UNAUTHORIZED", "This login link is invalid, expired, or already used");

  if (parsed.data.mode === "web") {
    const otpToken = await createOtpSession(user.id);
    return v1Data({ otpToken, path: user.role === "ADMIN" ? "/admin" : "/dashboard" });
  }

  const tokens = await issueTokenPair(
    { id: user.id, role: user.role },
    deviceMeta(req, parsed.data.deviceName || "Android")
  );
  return v1Data(tokens);
}

export const POST = observe(postHandler);
