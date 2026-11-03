import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { createSmsGatewayPairing, listSmsGatewayDevices } from "@/lib/sms-gateway";
import { approvePaymentFromBankCredit } from "@/lib/bank-credit-ledger";
import { parseBankSms } from "@/lib/payments/bank-parser";
import { getPaymentsConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

export const runtime = "nodejs";

function appOrigin(req: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    const url = new URL(configured);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("The app URL must use HTTPS for device pairing.");
    return url.origin;
  }
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const host = (forwardedHost || req.nextUrl.host).split(",")[0].trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = process.env.NODE_ENV === "production" ? "https" : (forwardedProto || req.nextUrl.protocol.replace(":", ""));
  return new URL(`${protocol}://${host}`).origin;
}

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const [devices, credits, pendingPayments] = await Promise.all([
    listSmsGatewayDevices(),
    prisma.bankCredit.findMany({
      orderBy: { receivedAt: "desc" }, take: 100,
      include: { payment: { select: { id: true, status: true, amount: true, user: { select: { email: true } } } }, shopOrder: { select: { id: true, status: true, user: { select: { email: true } } } }, device: { select: { name: true } } }
    }),
    prisma.payment.findMany({
      where: { status: "PENDING", method: "upi" }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, amount: true, createdAt: true, expiresAt: true, user: { select: { email: true } } }
    })
  ]);
  return NextResponse.json({ devices, credits, pendingPayments });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action || "");
  const ip = getClientIp(req.headers);
  if (action === "pair") {
    try {
      const payload = await createSmsGatewayPairing(appOrigin(req));
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), { margin: 1, width: 360, errorCorrectionLevel: "M" });
      await logAudit({ userId: guard.user.id, action: "settings.payments.update", entity: "SmsGatewayPairingToken", metadata: { expiresAt: payload.expiresAt }, ip });
      return NextResponse.json({ payload, qrDataUrl });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create a pairing QR." }, { status: 400 });
    }
  }
  if (action === "revoke") {
    const deviceId = String(body.deviceId || "");
    const result = await prisma.smsGatewayDevice.updateMany({ where: { id: deviceId, active: true }, data: { active: false } });
    if (!result.count) return NextResponse.json({ error: "Device not found or already revoked." }, { status: 404 });
    await logAudit({ userId: guard.user.id, action: "settings.payments.update", entity: "SmsGatewayDevice", entityId: deviceId, metadata: { active: false }, ip });
    return NextResponse.json({ ok: true });
  }
  if (action === "test-parser") {
    const cfg = await getPaymentsConfig();
    const result = parseBankSms(String(body.sender || ""), String(body.message || ""), cfg.smsSenderAllow.split(",").map((value) => value.trim()).filter(Boolean));
    return NextResponse.json({ ok: !!result, parsed: result });
  }
  if (action === "claim-credit") {
    const paymentId = String(body.paymentId || "");
    const creditId = String(body.creditId || "");
    const result = await approvePaymentFromBankCredit(paymentId, creditId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    await logAudit({ userId: guard.user.id, action: "payment.approve", entity: "BankCredit", entityId: creditId, reason: "Admin matched a bank credit to a UPI payment.", metadata: { paymentId, matchedBy: "creditId" }, ip });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
