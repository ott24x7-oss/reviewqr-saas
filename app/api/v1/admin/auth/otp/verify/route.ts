import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminOtpVerifySchema } from "@reviewqr/shared";
import { deviceMeta, parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { openAdminDevice } from "@/lib/admin/devices";
import { verifyAdminOtp } from "@/lib/admin/otp";
import { issueAdminTokenPair } from "@/lib/auth/sessions";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const limit = await rateLimitDb({ key: `admin-otp-verify:${getClientIp(req.headers)}`, limit: 30, windowSeconds: 600 });
  if (!limit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");
  const parsed = await parseJson(req, adminOtpVerifySchema);
  if (!parsed.ok) return parsed.response;
  const verified = await verifyAdminOtp(parsed.data.phone, parsed.data.code);
  if (!verified.ok) return v1Error(400, "VALIDATION", verified.error);
  const device = await openAdminDevice({
    userId: verified.user.id,
    deviceId: parsed.data.deviceId,
    name: parsed.data.deviceName,
    platform: parsed.data.platform || "android",
    pushToken: parsed.data.pushToken
  });
  const tokens = await issueAdminTokenPair(verified.user, device.id, deviceMeta(req, parsed.data.deviceName));
  return v1Data({
    ...tokens,
    device: { id: device.id, status: device.status, name: device.name, platform: device.platform }
  });
}
export const POST = observe(postHandler);
