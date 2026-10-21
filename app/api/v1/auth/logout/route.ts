import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { logoutSchema } from "@reviewqr/shared";
import { parseJson, v1Data } from "@/lib/api/v1";
import { revokeRefreshToken } from "@/lib/auth/sessions";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const parsed = await parseJson(req, logoutSchema);
  if (!parsed.ok) return parsed.response;
  await revokeRefreshToken(parsed.data.refreshToken);
  return v1Data({ ok: true as const });
}
export const POST = observe(postHandler);
