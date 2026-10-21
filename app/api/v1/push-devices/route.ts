import { NextRequest } from "next/server";
import { pushRegisterSchema, pushUnregisterSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const limit = await rateLimitDb({ key: `push:${auth.user.id}`, limit: 30, windowSeconds: 600 });
  if (!limit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");

  const parsed = await parseJson(req, pushRegisterSchema);
  if (!parsed.ok) return parsed.response;

  const device = await prisma.pushDevice.upsert({
    where: { token: parsed.data.token },
    update: { userId: auth.user.id, platform: parsed.data.platform, lastSeenAt: new Date() },
    create: {
      userId: auth.user.id,
      token: parsed.data.token,
      platform: parsed.data.platform
    },
    select: { id: true, platform: true, token: true }
  });
  return v1Data({ id: device.id, platform: device.platform, token: device.token });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, pushUnregisterSchema);
  if (!parsed.ok) return parsed.response;
  await prisma.pushDevice.deleteMany({ where: { token: parsed.data.token, userId: auth.user.id } });
  return v1Data({ ok: true as const });
}
