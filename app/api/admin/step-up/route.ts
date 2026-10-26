import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { consumeAdminStepUp, sendAdminStepUp } from "@/lib/admin/step-up";
import { issueWebStepToken, WEB_STEP_COOKIE } from "@/lib/admin/web-step";
import { STEP_UP_TTL_SEC } from "@/lib/auth/access-token";

const schema = z.object({ code: z.string().trim().min(4).max(8).optional() });

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
  const consumed = await consumeAdminStepUp(guard.user.id, "web", parsed.data.code);
  if (!consumed.ok) return NextResponse.json({ error: consumed.error }, { status: consumed.status });
  const token = issueWebStepToken(guard.user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WEB_STEP_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STEP_UP_TTL_SEC
  });
  return res;
}
