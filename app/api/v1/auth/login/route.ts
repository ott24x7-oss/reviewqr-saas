import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { loginSchema } from "@reviewqr/shared";
import { comparePassword } from "@/lib/auth";
import { deviceMeta, parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { issueTokenPair, tokenConfigError } from "@/lib/auth/sessions";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const parsed = await parseJson(req, loginSchema);
  if (!parsed.ok) return parsed.response;

  const email = parsed.data.email.toLowerCase().trim();
  const limit = await rateLimitDb({ key: `login:${email}`, limit: 10, windowSeconds: 600 });
  if (!limit.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts");

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user?.password ? await comparePassword(parsed.data.password, user.password) : false;
  if (!user || !user.password || user.deletedAt || !passwordOk) {
    return v1Error(401, "UNAUTHORIZED", "Email or password is wrong");
  }

  if (tokenConfigError()) return v1Error(500, "INTERNAL", "AUTH_TOKEN_SECRET is not set");
  const tokens = await issueTokenPair(
    { id: user.id, role: user.role },
    deviceMeta(req, parsed.data.deviceName)
  );
  return v1Data(tokens);
}
export const POST = observe(postHandler);
