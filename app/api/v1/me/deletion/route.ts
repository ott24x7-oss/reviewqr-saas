import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { accountDeletionSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { eraseAccount } from "@/lib/account";
import { logAudit } from "@/lib/admin";
import { otpRequestBody } from "@/lib/auth/dev-otp";
import { phoneKey, requestPurposeOtp, verifyPurposeOtp } from "@/lib/otp";
import { enforceOtpLimits, OTP_RESEND_AFTER_SEC, otpIpLimits, otpLimitMessage, otpPhoneLimits } from "@/lib/otp-message";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PURPOSE = "account-delete";

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role === "ADMIN") {
    return v1Error(403, "FORBIDDEN", "Admin accounts cannot be deleted here.");
  }
  const parsed = await parseJson(req, accountDeletionSchema);
  if (!parsed.ok) return parsed.response;
  const phone = phoneKey(auth.user.phone || "");
  if (!phone) return v1Error(400, "VALIDATION", "Add a mobile number before deleting this account.");

  if (parsed.data.action === "request") {
    const ip = getClientIp(req.headers);
    const ipLimit = await enforceOtpLimits(otpIpLimits(ip, "login"), rateLimitDb);
    if (!ipLimit.ok) return v1Error(429, "RATE_LIMIT", otpLimitMessage(ipLimit.key));
    const phoneLimit = await enforceOtpLimits(otpPhoneLimits(phone), rateLimitDb);
    if (!phoneLimit.ok) return v1Error(429, "RATE_LIMIT", otpLimitMessage(phoneLimit.key));
    const sent = await requestPurposeOtp({
      identifier: auth.user.id,
      phone,
      purpose: PURPOSE,
      email: auth.user.email
    });
    if (!sent.ok) return v1Error(503, "UNAVAILABLE", sent.error);
    if (sent.channel !== "whatsapp" && sent.channel !== "email" && sent.channel !== "dev") {
      return v1Error(503, "UNAVAILABLE", "We could not send a code right now");
    }
    return v1Data(
      otpRequestBody(sent.issuedCode, process.env, {
        channel: sent.channel,
        resendAfterSec: OTP_RESEND_AFTER_SEC,
        message: "Enter this code to delete your account."
      })
    );
  }

  const checked = await verifyPurposeOtp(auth.user.id, PURPOSE, parsed.data.code);
  if (!checked.ok) return v1Error(400, "VALIDATION", checked.error);
  await eraseAccount(auth.user.id);
  await logAudit({
    userId: auth.user.id,
    action: "account.delete",
    entity: "User",
    entityId: auth.user.id,
    ip: getClientIp(req.headers)
  });
  return v1Data({ ok: true as const });
}

export const POST = observe(postHandler);
