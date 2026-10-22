import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmAgentOnboarding } from "@/lib/plans/agents";

const schema = z.object({
  phone: z.string().min(10),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().trim().min(2).max(80)
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter the mobile, code, and name" }, { status: 400 });
  const result = await confirmAgentOnboarding(parsed.data.phone, parsed.data.code, parsed.data.name);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, businessId: result.businessId });
}
