import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { prisma } from "./db";
import { redirect } from "next/navigation";
import { deviceAuditAction, type DeviceStatusName } from "./tap/device-status";

/** Server-component guard: redirects non-admins to /dashboard or /login. */
export async function requireAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return session.user;
}

/** API-route guard: returns the session user or a 403/401 response. */
export async function requireAdminApi() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { user: session.user } as const;
}

export type AuditAction =
  | "user.update"
  | "user.delete"
  | "user.tier.change"
  | "user.role.change"
  | "user.subscription.extend"
  | "business.archive"
  | "business.update"
  | "business.delete"
  | "settings.payments.update"
  | "settings.email.update"
  | "settings.whatsapp.update"
  | "settings.ai.update"
  | "settings.site.update"
  | "settings.turnstile.update"
  | "pricing.update"
  | "email.test"
  | "admin.login"
  | "payment.approve"
  | "payment.reject"
  | "payment.refund"
  | "feedback.erase_contact"
  | "account.delete"
  | "user.impersonate"
  | "business.suspend"
  | "support.reply"
  | "theme.update"
  | "theme.admin"
  | "tap.publish"
  | "preset.update"
  | "qr.generate"
  | "qr.assign"
  | "qr.reassign"
  | "qr.unassign"
  | "qr.disable"
  | "qr.enable"
  | "qr.label"
  | "qr.location"
  | "device.assign"
  | "device.activate"
  | "device.reassign"
  | "device.disable"
  | "device.lost"
  | "device.uid"
  | "print.batch"
  | "catalog.update"
  | "settings.shipping.update"
  | "settings.shop.update"
  | "shop.order.pay"
  | "shop.order.move"
  | "shop.order.ndr";

export async function logAudit(opts: {
  userId?: string;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        metadata: opts.metadata as any,
        ip: opts.ip,
        userAgent: opts.userAgent
      }
    });
  } catch (e) {
    console.warn("[audit] log failed:", e);
  }
}

export async function logDeviceAudit(opts: {
  userId?: string;
  deviceId: string;
  code: string;
  from: DeviceStatusName;
  to: DeviceStatusName;
  businessChanged: boolean;
  ip?: string;
  userAgent?: string;
}) {
  if (opts.from === opts.to && !opts.businessChanged) return;
  await logAudit({
    userId: opts.userId,
    action: deviceAuditAction(opts.from, opts.to, opts.businessChanged),
    entity: "Device",
    entityId: opts.deviceId,
    metadata: {
      code: opts.code,
      from: opts.from,
      to: opts.to,
      businessChanged: opts.businessChanged
    },
    ip: opts.ip,
    userAgent: opts.userAgent
  });
}

/** Mask secrets in API responses so the dashboard never round-trips them in cleartext. */
export function maskSecret(s: string | undefined | null) {
  if (!s) return "";
  if (s.length <= 6) return "•".repeat(s.length);
  return s.slice(0, 3) + "•".repeat(Math.max(4, s.length - 6)) + s.slice(-3);
}
