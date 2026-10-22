import { NextRequest, NextResponse } from "next/server";
import { requireV1User } from "@/lib/api/v1";
import { istDayKey } from "@/lib/analytics/ist";
import { monthlyPdfFor } from "@/lib/reports/run";
import { requireBusinessRole } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const businessId = req.nextUrl.searchParams.get("businessId") || "";
  const access = await requireBusinessRole(auth.user.id, businessId, "read");
  if (!access) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Business not found" } }, { status: 404 });
  const today = istDayKey(new Date());
  const month = req.nextUrl.searchParams.get("month") || today.slice(0, 7);
  const report = await monthlyPdfFor(businessId, month);
  if (!report) return NextResponse.json({ error: { code: "VALIDATION", message: "Invalid month" } }, { status: 400 });
  return new NextResponse(new Uint8Array(report.pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${report.filename}"`
    }
  });
}
