import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readReportToken } from "@/lib/reports/token";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const userId = readReportToken(token);
  if (!userId) {
    return new NextResponse("This unsubscribe link is not valid.", { status: 400, headers: { "content-type": "text/plain" } });
  }
  await prisma.reportPreference.upsert({
    where: { userId },
    create: { userId, emailOptIn: false, whatsappOptIn: false, unsubscribedAt: new Date() },
    update: { emailOptIn: false, whatsappOptIn: false, unsubscribedAt: new Date() }
  });
  return new NextResponse("You will no longer receive ReviewQR reports. / अब रिपोर्ट नहीं आएगी।", {
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}
