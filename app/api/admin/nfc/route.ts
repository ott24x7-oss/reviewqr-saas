import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { recordChipUid } from "@/lib/tap/nfc-record";

const schema = z.object({
  code: z.string().min(4).max(32),
  chipUid: z.string().min(4).max(40),
  chip: z.enum(["NTAG213", "NTAG215", "NTAG216"])
});

export async function GET() {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const devices = await prisma.device.findMany({
    where: { chipUid: null, status: { in: ["IN_STOCK", "ASSIGNED", "ACTIVE"] } },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { shortCode: true, kind: true, status: true, tableLabel: true }
  });
  return NextResponse.json({
    devices: devices.map((device) => ({
      code: device.shortCode,
      kind: device.kind,
      status: device.status,
      label: device.tableLabel || ""
    }))
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Check the chip details" }, { status: 400 });
  const saved = await recordChipUid(parsed.data);
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: saved.status });
  if (saved.changed) {
    await logAudit({
      userId: admin.user.id,
      action: "device.uid",
      entity: "Device",
      entityId: saved.id,
      metadata: { code: saved.code, chipUid: saved.chipUid, chip: saved.chip },
      ip: getClientIp(req.headers),
      userAgent: req.headers.get("user-agent") || undefined
    });
  }
  return NextResponse.json({ ok: true, code: saved.code, chipUid: saved.chipUid });
}
