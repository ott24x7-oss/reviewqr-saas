import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { prisma } from "./db";
import { redirect } from "next/navigation";

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
  | "settings.site.update"
  | "settings.turnstile.update"
  | "pricing.update"
  | "email.test"
  | "admin.login";

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

/** Mask secrets in API responses so the dashboard never round-trips them in cleartext. */
export function maskSecret(s: string | undefined | null) {
  if (!s) return "";
  if (s.length <= 6) return "•".repeat(s.length);
  return s.slice(0, 3) + "•".repeat(Math.max(4, s.length - 6)) + s.slice(-3);
}
