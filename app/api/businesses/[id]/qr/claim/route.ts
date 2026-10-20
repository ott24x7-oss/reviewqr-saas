import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { rateLimitDb } from "@/lib/rate-limit";
import { logAudit } from "@/lib/admin";
import { getClientIp } from "@/lib/utils";
import { codeFromScan } from "@/lib/tap/qr-stock";
import { assignQr } from "@/lib/tap/qr-mutate";
import { markOnboarding } from "@/lib/tap/onboarding-mark";

const schema = z.object({
  code: z.string().min(4).max(500),
  confirm: z.boolean().optional(),
  label: z.string().max(80).optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const limit = await rateLimitDb({ key: `qr-claim:${user.id}`, limit: 30, windowSeconds: 60 });
  if (!limit.ok) return NextResponse.json({ error: "Too many lookups. Try again in a minute." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter the code printed on the QR" }, { status: 400 });
  const code = codeFromScan(parsed.data.code);
  if (!code) return NextResponse.json({ error: "Enter the code printed on the QR" }, { status: 400 });

  const result = await assignQr({
    code,
    businessId: business.id,
    label: parsed.data.label,
    confirm: parsed.data.confirm === true,
    allowReassign: false
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message || result.error, support: result.support === true, needsConfirm: result.needsConfirm === true },
      { status: result.status }
    );
  }
  if (result.change) {
    await markOnboarding(business.ownerId, "printed_qr");
    await logAudit({
      userId: user.id,
      action: "qr.assign",
      entity: "QRCode",
      entityId: result.change.id,
      metadata: {
        code: result.change.code,
        fromBusinessId: result.change.fromBusinessId,
        toBusinessId: result.change.toBusinessId,
        label: result.change.label
      },
      ip: getClientIp(req.headers),
      userAgent: req.headers.get("user-agent") || undefined
    });
  }
  return NextResponse.json({ ok: true, already: result.already === true, code: result.change?.code || code });
}
