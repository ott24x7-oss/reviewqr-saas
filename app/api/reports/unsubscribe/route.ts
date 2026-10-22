import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_BRAND_NAME } from "@/lib/brand-defaults";
import { readReportToken } from "@/lib/reports/token";

export const dynamic = "force-dynamic";

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Confirm page only. Opening the link does not change preferences. */
export function unsubscribeConfirmHtml(token: string) {
  const safe = escapeAttr(token);
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Unsubscribe</title></head>
<body>
  <p>Stop weekly ${DEFAULT_BRAND_NAME} reports?</p>
  <form method="post" action="/api/reports/unsubscribe">
    <input type="hidden" name="token" value="${safe}">
    <button type="submit">Unsubscribe</button>
  </form>
</body>
</html>`;
}

async function tokenFrom(req: NextRequest) {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { token?: unknown };
    return typeof body.token === "string" ? body.token : "";
  }
  const text = await req.text();
  return new URLSearchParams(text).get("token") || "";
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token || !readReportToken(token)) {
    return new NextResponse("This unsubscribe link is not valid.", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return new NextResponse(unsubscribeConfirmHtml(token), {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}

export async function POST(req: NextRequest) {
  const token = (await tokenFrom(req)) || req.nextUrl.searchParams.get("token") || "";
  const userId = readReportToken(token);
  if (!userId) {
    return new NextResponse("This unsubscribe link is not valid.", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  await prisma.reportPreference.upsert({
    where: { userId },
    create: { userId, emailOptIn: false, whatsappOptIn: false, unsubscribedAt: new Date() },
    update: { emailOptIn: false, whatsappOptIn: false, unsubscribedAt: new Date() }
  });
  return new NextResponse(`You will no longer receive ${DEFAULT_BRAND_NAME} reports. / अब रिपोर्ट नहीं आएगी।`, {
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}
