import { observe } from "@/lib/api/observe";
import { v1Data, v1Error } from "@/lib/api/v1";
import { rateLimitDb } from "@/lib/rate-limit";
import { getAppReleaseConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const limited = await rateLimitDb({
    key: `app-config:${getClientIp(req.headers)}`,
    limit: 60,
    windowSeconds: 60
  });
  if (!limited.ok) return v1Error(429, "RATE_LIMIT", "Try again in a moment");
  return v1Data(await getAppReleaseConfig());
}

export const GET = observe(getHandler);
