import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isPageError, readPage } from "@/lib/api/cursor";
import { planDeniedResponse } from "@/lib/plans/feature-gate";
import { listBookings } from "@/lib/store/bookings";
import type { ServiceResult } from "@/lib/api/result";

function fromService<T>(result: ServiceResult<T>) {
  if (!result.ok) {
    if (result.code === "PLAN_REQUIRED") return planDeniedResponse(result);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}

export async function GET(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const page = readPage(req.nextUrl.searchParams);
  if (isPageError(page)) return NextResponse.json({ error: page.error }, { status: 400 });
  const query = req.nextUrl.searchParams;
  return fromService(
    await listBookings(user.id, page, {
      businessId: query.get("businessId"),
      status: query.get("status"),
      date: query.get("date"),
      today: query.get("today") === "1" || query.get("today") === "true"
    })
  );
}
