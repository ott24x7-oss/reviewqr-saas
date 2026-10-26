import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { planDeniedResponse } from "@/lib/plans/feature-gate";
import { saveTapPage } from "@/lib/tap/page-save";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => ({}));
  const result = await saveTapPage(user.id, params.id, raw);
  if (!result.ok) {
    if (result.code === "PLAN_REQUIRED" && result.feature) return planDeniedResponse(result);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, published: result.data.published });
}
