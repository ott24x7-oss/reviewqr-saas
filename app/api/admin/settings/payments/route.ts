import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getPaymentsConfig, setPaymentsConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const incoming = (await req.json().catch(() => ({}))) as any;
  const current = await getPaymentsConfig();
  // Only overwrite secrets if the client actually sent them (form omits when unchanged).
  const next = {
    razorpayKeyId: String(incoming.razorpayKeyId ?? current.razorpayKeyId).trim(),
    razorpayKeySecret:
      typeof incoming.razorpayKeySecret === "string"
        ? incoming.razorpayKeySecret.trim()
        : current.razorpayKeySecret,
    razorpayWebhookSecret:
      typeof incoming.razorpayWebhookSecret === "string"
        ? incoming.razorpayWebhookSecret.trim()
        : current.razorpayWebhookSecret,
    razorpayLive: !!incoming.razorpayLive,
    stripeSecretKey:
      typeof incoming.stripeSecretKey === "string"
        ? incoming.stripeSecretKey.trim()
        : current.stripeSecretKey,
    stripeWebhookSecret:
      typeof incoming.stripeWebhookSecret === "string"
        ? incoming.stripeWebhookSecret.trim()
        : current.stripeWebhookSecret,
    stripePublishableKey: String(incoming.stripePublishableKey ?? current.stripePublishableKey).trim(),
    // UPI
    upiEnabled: typeof incoming.upiEnabled === "boolean" ? incoming.upiEnabled : current.upiEnabled,
    upiId: String(incoming.upiId ?? current.upiId).trim(),
    upiPayeeName: String(incoming.upiPayeeName ?? current.upiPayeeName).trim() || "ReviewQR",
    upiQrDataUrl: String(incoming.upiQrDataUrl ?? current.upiQrDataUrl),
    // USDT
    usdtEnabled: typeof incoming.usdtEnabled === "boolean" ? incoming.usdtEnabled : current.usdtEnabled,
    usdtNetwork: String(incoming.usdtNetwork ?? current.usdtNetwork).trim() || "TRC20",
    usdtAddress: String(incoming.usdtAddress ?? current.usdtAddress).trim(),
    usdtRateInr: Number(incoming.usdtRateInr) > 0 ? Number(incoming.usdtRateInr) : current.usdtRateInr,
    // Email auto-verify (IMAP)
    mailVerifyEnabled:
      typeof incoming.mailVerifyEnabled === "boolean" ? incoming.mailVerifyEnabled : current.mailVerifyEnabled,
    mailImapHost: String(incoming.mailImapHost ?? current.mailImapHost).trim(),
    mailImapPort: Number(incoming.mailImapPort) || current.mailImapPort || 993,
    mailImapUser: String(incoming.mailImapUser ?? current.mailImapUser).trim(),
    mailImapPass:
      typeof incoming.mailImapPass === "string" ? incoming.mailImapPass.trim() : current.mailImapPass,
    mailFromFilter: String(incoming.mailFromFilter ?? current.mailFromFilter).trim()
  };

  await setPaymentsConfig(next, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "settings.payments.update",
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
