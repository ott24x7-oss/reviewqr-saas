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
    upiId: String(incoming.upiId ?? current.upiId).trim(),
    upiPayeeName: String(incoming.upiPayeeName ?? current.upiPayeeName).trim() || "ReviewQR"
  };

  await setPaymentsConfig(next, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "settings.payments.update",
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}
