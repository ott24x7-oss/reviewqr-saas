import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminStepUpSchema } from "@reviewqr/shared";
import { parseJson, v1Data, v1Error } from "@/lib/api/v1";
import { requireAdminActor } from "@/lib/admin/guard";
import { consumeAdminStepUp, sendAdminStepUp } from "@/lib/admin/step-up";
import { otpRequestBody } from "@/lib/auth/dev-otp";
import { preferredOtpChannel } from "@/lib/otp";
import { OTP_RESEND_AFTER_SEC } from "@/lib/otp-message";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminStepUpSchema);
  if (!parsed.ok) return parsed.response;
  if (!parsed.data.code) {
    const sent = await sendAdminStepUp(auth.actor.user.id);
    if (!sent.ok) return v1Error(sent.status, sent.status === 429 ? "RATE_LIMIT" : sent.status === 403 ? "FORBIDDEN" : "VALIDATION", sent.error);
    return v1Data(
      otpRequestBody(sent.issuedCode, process.env, {
        channel: await preferredOtpChannel(),
        resendAfterSec: OTP_RESEND_AFTER_SEC,
        message: "Enter this code to confirm the change"
      })
    );
  }
  const token = await consumeAdminStepUp(auth.actor.user.id, auth.actor.device.id, parsed.data.code);
  if (!token.ok) return v1Error(token.status, "VALIDATION", token.error);
  return v1Data({ stepUpToken: token.stepUpToken, expiresIn: token.expiresIn });
}
export const POST = observe(postHandler);
