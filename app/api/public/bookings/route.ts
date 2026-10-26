import { NextRequest, NextResponse } from "next/server";
import { planDeniedResponse } from "@/lib/plans/feature-gate";
import { createPublicBooking } from "@/lib/store/booking-public";
import { getClientIp } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const result = await createPublicBooking({
    raw: await req.json().catch(() => ({})),
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent")
  });
  if (!result.ok) {
    if (result.code === "PLAN_REQUIRED") return planDeniedResponse(result);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (result.data.ignored) return NextResponse.json({ ok: true, ignored: true });
  return NextResponse.json({ ok: true, id: result.data.id, whatsappUrl: result.data.whatsappUrl });
}
