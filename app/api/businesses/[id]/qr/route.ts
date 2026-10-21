import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { qrCodeSchema } from "@/lib/validations";
import { ownerLimitError } from "@/lib/entitlements";
import { locationInBusiness, planOwner, requireBusinessRole, staffInBusiness } from "@/lib/tenant";
import { logAudit, logDeviceAudit, type AuditAction } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";
import { createAssignedCode, setManyEnabled, setQrLabel, setQrLocation, type QrChange } from "@/lib/tap/qr-mutate";
import { isLookupCode } from "@/lib/tap/ids";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireBusinessRole(user.id, params.id, "manage");
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const codes = await prisma.qRCode.findMany({
    where: { businessId: params.id },
    include: {
      location: { select: { name: true, slug: true } },
      staff: { select: { name: true, slug: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ qrCodes: codes });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const owner = await planOwner(user, business.ownerId);
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = qrCodeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const data = parsed.data;
  const [location, staff, qrCount] = await Promise.all([
    locationInBusiness(business.id, data.locationId),
    staffInBusiness(business.id, data.staffId),
    prisma.qRCode.count({ where: { business: { ownerId: business.ownerId } } })
  ]);
  if (!location.ok) return NextResponse.json({ error: location.error }, { status: 400 });
  if (!staff.ok) return NextResponse.json({ error: staff.error }, { status: 400 });
  const limitError = await ownerLimitError(owner, "qrCodes", qrCount);
  if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });

  const qr = await createAssignedCode({
    businessId: business.id,
    type: data.type,
    label: data.label,
    locationId: data.locationId || null,
    staffId: data.staffId || null
  });
  await logAudit({
    userId: user.id,
    action: "qr.assign",
    entity: "QRCode",
    entityId: qr.id,
    metadata: { code: qr.shortCode, toBusinessId: business.id, label: qr.label, created: true },
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent") || undefined
  });

  return NextResponse.json({ qrCode: qr });
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("label"), code: z.string(), label: z.string().min(1).max(80) }),
  z.object({ action: z.literal("location"), code: z.string(), locationId: z.string().nullable() }),
  z.object({
    action: z.enum(["disable", "enable"]),
    codes: z.array(z.string()).min(1).max(100)
  })
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;
  const codes = body.action === "label" || body.action === "location" ? [body.code] : body.codes;
  if (codes.some((code) => !isLookupCode(code))) {
    return NextResponse.json({ error: "Enter a valid QR code" }, { status: 400 });
  }

  if (body.action === "label") {
    const result = await setQrLabel(body.code, body.label, business.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await writeQrAudit(req, user.id, "qr.label", result.change);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "location") {
    const result = await setQrLocation(body.code, body.locationId, business.id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await writeQrAudit(req, user.id, "qr.location", result.change);
    return NextResponse.json({ ok: true });
  }

  const result = await setManyEnabled(body.codes, business.id, body.action === "enable");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  const action: AuditAction = body.action === "enable" ? "qr.enable" : "qr.disable";
  for (const row of result.rows) {
    await writeQrAudit(req, user.id, action, {
      id: row.id,
      code: row.shortCode,
      fromBusinessId: row.businessId,
      toBusinessId: row.businessId,
      fromStatus: row.status,
      toStatus: result.toStatus,
      label: row.label
    });
  }
  for (const device of result.devices) {
    await logDeviceAudit({
      userId: user.id,
      deviceId: device.id,
      code: device.code,
      from: device.from,
      to: device.to,
      businessChanged: device.businessChanged,
      ip: getClientIp(req.headers),
      userAgent: req.headers.get("user-agent") || undefined
    });
  }
  return NextResponse.json({ ok: true });
}

async function writeQrAudit(req: NextRequest, userId: string, action: AuditAction, change: QrChange) {
  await logAudit({
    userId,
    action,
    entity: "QRCode",
    entityId: change.id,
    metadata: {
      code: change.code,
      fromBusinessId: change.fromBusinessId,
      toBusinessId: change.toBusinessId,
      fromStatus: change.fromStatus,
      toStatus: change.toStatus,
      label: change.label
    },
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent") || undefined
  });
}
