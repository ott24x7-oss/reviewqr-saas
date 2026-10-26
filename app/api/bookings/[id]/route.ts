import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { planDeniedResponse } from "@/lib/plans/feature-gate";
import { loadBooking } from "@/lib/store/bookings";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await loadBooking(user.id, params.id);
  if (!result.ok) {
    if (result.code === "PLAN_REQUIRED") return planDeniedResponse(result);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
