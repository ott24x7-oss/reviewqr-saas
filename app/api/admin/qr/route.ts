import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, logAudit, type AuditAction } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";
import { codeFromScan } from "@/lib/tap/qr-stock";
import { assignQr, generateStock, setQrEnabled, unassignQr, type QrChange } from "@/lib/tap/qr-mutate";

const generateSchema = z.object({
  count: z.number().int().min(1).max(100)
});

const patchSchema = z.object({
  code: z.string().min(4).max(500),
  action: z.enum(["assign", "reassign", "unassign", "disable", "enable"]),
  businessId: z.string().optional(),
  label: z.string().max(80).optional(),
  confirm: z.boolean().optional()
});

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const parsed = generateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose between 1 and 100 codes" }, { status: 400 });

  const codes = await generateStock(parsed.data.count);
  await logAudit({
    userId: admin.user.id,
    action: "qr.generate",
    entity: "QRCode",
    metadata: { count: codes.length, codes },
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent") || undefined
  });
  return NextResponse.json({ ok: true, codes });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  const code = codeFromScan(parsed.data.code);
  if (!code) return NextResponse.json({ error: "Enter a valid QR code" }, { status: 400 });
  const confirm = parsed.data.confirm === true;

  if (parsed.data.action === "unassign") {
    const result = await unassignQr(code, confirm);
    if (!result.ok) return confirmResponse(result);
    await writeAudit(req, admin.user.id, "qr.unassign", result.change);
    return NextResponse.json({ ok: true, code: result.change.code });
  }
  if (parsed.data.action === "disable" || parsed.data.action === "enable") {
    const result = await setQrEnabled(code, parsed.data.action === "enable", confirm);
    if (!result.ok) return confirmResponse(result);
    const action: AuditAction = parsed.data.action === "enable" ? "qr.enable" : "qr.disable";
    await writeAudit(req, admin.user.id, action, result.change);
    return NextResponse.json({ ok: true, code: result.change.code });
  }

  if (!parsed.data.businessId) return NextResponse.json({ error: "Choose a business" }, { status: 400 });
  const result = await assignQr({
    code,
    businessId: parsed.data.businessId,
    label: parsed.data.label,
    confirm,
    allowReassign: true
  });
  if (!result.ok) return confirmResponse(result);
  if (result.change) {
    const action: AuditAction = result.change.fromBusinessId ? "qr.reassign" : "qr.assign";
    await writeAudit(req, admin.user.id, action, result.change);
  }
  return NextResponse.json({ ok: true, already: result.already === true, code: result.change?.code || code });
}

function confirmResponse(result: { status: number; error: string; support?: boolean; needsConfirm?: boolean; message?: string }) {
  return NextResponse.json(
    { error: result.error, message: result.message || result.error, needsConfirm: result.needsConfirm === true, support: result.support === true },
    { status: result.status }
  );
}

async function writeAudit(req: NextRequest, userId: string, action: AuditAction, change: QrChange) {
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
      label: change.label,
      actor: userId
    },
    ip: getClientIp(req.headers),
    userAgent: req.headers.get("user-agent") || undefined
  });
}
