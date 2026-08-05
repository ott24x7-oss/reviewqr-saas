import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getPaymentsConfig, setPaymentsConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const incoming = (await req.json().catch(() => ({}))) as any;
  const current = await getPaymentsConfig();
  // Only overwrite a secret when the client sent a real, edited value. A missing
  // field, or a masked value echoed back from the form (contains the "•" mask
  // char), preserves the stored secret — never clobbers it with dots.
  const secret = (incoming: unknown, cur: string) =>
    typeof incoming === "string" && incoming.trim() && !incoming.includes("•")
      ? incoming.trim()
      : cur;
  const next = {
    razorpayKeyId: String(incoming.razorpayKeyId ?? current.razorpayKeyId).trim(),
    razorpayKeySecret: secret(incoming.razorpayKeySecret, current.razorpayKeySecret),
    razorpayWebhookSecret: secret(incoming.razorpayWebhookSecret, current.razorpayWebhookSecret),
    razorpayLive: !!incoming.razorpayLive,
    stripeSecretKey: secret(incoming.stripeSecretKey, current.stripeSecretKey),
    stripeWebhookSecret: secret(incoming.stripeWebhookSecret, current.stripeWebhookSecret),
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
    mailImapPass: secret(incoming.mailImapPass, current.mailImapPass),
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
