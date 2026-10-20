import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { deviceTypeFromUa, hashIp, recordQrScan } from "@/lib/scans";
import { isLookupCode } from "@/lib/tap/ids";
import { getClientIp } from "@/lib/utils";

const bodySchema = z.object({
  code: z.string().min(4).max(32),
  type: z.enum(["view", "click"]),
  linkKey: z.string().max(40).optional(),
  source: z.enum(["qr", "nfc", "link"]).optional()
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || !isLookupCode(parsed.data.code)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  const qr = await prisma.qRCode.findUnique({
    where: { shortCode: data.code },
    select: { id: true, businessId: true }
  });
  const limit = await rateLimitDb({
    key: `tap:${ip}:${qr ? "known" : "unknown"}`,
    limit: qr ? 120 : 30,
    windowSeconds: 60
  });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const source = data.source || "qr";
  if (data.type === "view") {
    await recordQrScan(qr.id, req.headers, source).catch(() => {});
  }
  await prisma.tapEvent.create({
    data: {
      businessId: qr.businessId,
      qrCodeId: qr.id,
      type: data.type,
      linkKey: data.linkKey || null,
      source,
      deviceType: deviceTypeFromUa(req.headers.get("user-agent") || ""),
      ipHash: hashIp(ip)
    }
  });
  return NextResponse.json({ ok: true });
}
