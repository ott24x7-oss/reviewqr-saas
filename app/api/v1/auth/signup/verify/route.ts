import { NextRequest } from "next/server";
import { v1Data, v1Error } from "@/lib/api/v1";
import { claimWhatsappSignupToken } from "@/lib/auth/signup-otp";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await rateLimitDb({
    key: `signup-link-claim:${getClientIp(req.headers)}`,
    limit: 10,
    windowSeconds: 600
  });
  if (!limited.ok) return v1Error(429, "RATE_LIMIT", "Too many attempts. Try again later.");

  const body = await req.json().catch(() => ({}));
  const claimed = await claimWhatsappSignupToken(body && typeof body === "object" ? body.signupToken : undefined);
  if (!claimed) return v1Error(400, "INVALID_SIGNUP_LINK", "This signup link has expired or was already used.");
  return v1Data(claimed);
}
