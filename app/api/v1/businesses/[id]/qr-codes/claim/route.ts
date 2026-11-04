import { observe } from "@/lib/api/observe";
import { NextRequest, NextResponse } from "next/server";
import { requireV1User, v1Error, v1Data } from "@/lib/api/v1";
import { codeForStatus } from "@/lib/api/result";
import { claimQrCode } from "@/lib/tap/qr-api";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  const result = await claimQrCode(auth.user.id, params.id, raw, {
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent") || undefined
  });
  if (!result.ok) {
    if (result.body.code === "PLAN_REQUIRED" && result.body.feature) {
      return NextResponse.json(
        {
          code: "PLAN_REQUIRED",
          feature: result.body.feature,
          error: { code: "PLAN_REQUIRED", feature: result.body.feature, message: result.body.error }
        },
        { status: result.status }
      );
    }
    return v1Error(result.status, codeForStatus(result.status), result.body.message);
  }
  return v1Data(result.data);
}
export const POST = observe(postHandler);
