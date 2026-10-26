import { cookies } from "next/headers";
import { STEP_UP_TTL_SEC, signAccessToken, verifyAccessToken } from "@/lib/auth/access-token";

export const WEB_STEP_COOKIE = "admin_step_up";

export function issueWebStepToken(userId: string) {
  return signAccessToken(
    { sub: userId, role: "ADMIN", aud: "admin-step-up", deviceId: "web" },
    undefined,
    undefined,
    STEP_UP_TTL_SEC
  );
}

export function webStepMatches(token: string | undefined, userId: string) {
  if (!token) return false;
  const claims = verifyAccessToken(token);
  return !!claims && claims.sub === userId && claims.aud === "admin-step-up" && claims.deviceId === "web" && claims.role === "ADMIN";
}

export function readWebStepUp(userId: string) {
  return webStepMatches(cookies().get(WEB_STEP_COOKIE)?.value, userId);
}
