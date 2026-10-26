import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminStepUpActionSchema } from "@reviewqr/shared";
import { requireAdminApi } from "@/lib/admin";
import { consumeAdminStepUp, sendAdminStepUp } from "@/lib/admin/step-up";
import { WEB_STEP_COOKIE, WEB_STEP_DEVICE } from "@/lib/admin/web-step";

const schema = z.object({
  code: z.string().trim().min(4).max(8).optional(),
  /** Required with a code. The cookie that comes back works only for this action, once. */
  action: adminStepUpActionSchema.optional()
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter the WhatsApp code" }, { status: 400 });
  if (!parsed.data.code) {
    const sent = await sendAdminStepUp(guard.user.id);
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: sent.status });
    return NextResponse.json({ ok: true });
  }
  if (!parsed.data.action) return NextResponse.json({ error: "Choose what this code confirms" }, { status: 400 });
  const consumed = await consumeAdminStepUp(guard.user.id, WEB_STEP_DEVICE, parsed.data.code, parsed.data.action);
  if (!consumed.ok) return NextResponse.json({ error: consumed.error }, { status: consumed.status });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WEB_STEP_COOKIE, consumed.stepUpToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api/admin",
    maxAge: consumed.expiresIn
  });
  return res;
}
