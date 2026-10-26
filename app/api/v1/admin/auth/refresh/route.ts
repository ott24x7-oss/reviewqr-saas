import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { refreshSchema } from "@reviewqr/shared";
import { deviceMeta, parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { verifyAccessToken } from "@/lib/auth/access-token";
import { refreshAudience, rotateRefreshToken } from "@/lib/auth/sessions";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const limit = await rateLimitDb({ key: `admin-refresh:${getClientIp(req.headers)}`, limit: 120, windowSeconds: 600 });
  if (!limit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");
  const parsed = await parseJson(req, refreshSchema);
  if (!parsed.ok) return parsed.response;
  if ((await refreshAudience(parsed.data.refreshToken)) !== "admin") {
    return v1Error(401, "UNAUTHORIZED", "Refresh token is not valid");
  }
  const result = await rotateRefreshToken(parsed.data.refreshToken, deviceMeta(req, parsed.data.deviceName));
  if (!result.ok) {
    const code = result.status === 500 ? "INTERNAL" : "UNAUTHORIZED";
    return v1Error(result.status, code, result.error);
  }
  const claims = verifyAccessToken(result.tokens.accessToken);
  if (!claims || claims.aud !== "admin" || !claims.deviceId) {
    return v1Error(401, "UNAUTHORIZED", "Refresh token is not valid");
  }
  const device = await prisma.adminDevice.findUnique({ where: { id: claims.deviceId } });
  if (!device || device.userId !== claims.sub) {
    return v1Error(401, "UNAUTHORIZED", "Refresh token is not valid");
  }
  return v1Data({
    ...result.tokens,
    device: { id: device.id, status: device.status, name: device.name, platform: device.platform }
  });
}
export const POST = observe(postHandler);
