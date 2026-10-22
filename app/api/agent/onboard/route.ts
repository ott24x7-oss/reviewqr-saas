import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { devOtpCode } from "@/lib/auth/dev-otp";
import { getSessionUser } from "@/lib/auth";
import { startAgentOnboarding } from "@/lib/plans/agents";

const schema = z.object({
  phone: z.string().min(10),
  businessName: z.string().min(2).max(80)
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "AGENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter the owner's mobile and business name" }, { status: 400 });
  const result = await startAgentOnboarding(user.id, parsed.data.phone, parsed.data.businessName);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const devCode = devOtpCode(result.issuedCode);
  return NextResponse.json({ ok: true, id: result.id, channel: result.channel, ...(devCode ? { devCode } : {}) });
}
