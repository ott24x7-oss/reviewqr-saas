import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { logoutSchema } from "@reviewqr/shared";
import { parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { revokeAdminRefreshToken } from "@/lib/auth/sessions";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const parsed = await parseJson(req, logoutSchema);
  if (!parsed.ok) return parsed.response;
  const result = await revokeAdminRefreshToken(parsed.data.refreshToken);
  if (!result.ok) return v1Error(401, "UNAUTHORIZED", "Refresh token is not valid");
  return v1Data({ ok: true as const });
}
export const POST = observe(postHandler);
