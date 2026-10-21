import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { refreshSchema } from "@reviewqr/shared";
import { deviceMeta, parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { rotateRefreshToken } from "@/lib/auth/sessions";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const limit = await rateLimitDb({ key: `refresh-ip:${getClientIp(req.headers)}`, limit: 120, windowSeconds: 600 });
  if (!limit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");
  const parsed = await parseJson(req, refreshSchema);
  if (!parsed.ok) return parsed.response;
  const result = await rotateRefreshToken(parsed.data.refreshToken, deviceMeta(req, parsed.data.deviceName));
  if (!result.ok) {
    const code = result.status === 500 ? "INTERNAL" : "UNAUTHORIZED";
    return v1Error(result.status, code, result.error);
  }
  return v1Data(result.tokens);
}
export const POST = observe(postHandler);
