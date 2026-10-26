import { NextRequest, NextResponse } from "next/server";
import { readBearer, verifyAccessToken } from "@/lib/auth/access-token";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { v1Error } from "@/lib/api/v1";
import type { AdminActor } from "./actor";

export type AdminGate =
  | { ok: true; actor: AdminActor }
  | { ok: false; response: NextResponse };

/** Bearer admin audience only. A cookie or an owner token is not enough. */
export async function requireAdminActor(req: NextRequest, opts?: { allowPending?: boolean }): Promise<AdminGate> {
  const token = readBearer(req.headers.get("authorization"));
  if (!token) return { ok: false, response: v1Error(401, "UNAUTHORIZED", "Sign in required") };
  const claims = verifyAccessToken(token);
  if (!claims || claims.aud !== "admin" || !claims.deviceId) {
    return { ok: false, response: v1Error(403, "FORBIDDEN", "Admin access only") };
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, phone: true, role: true, deletedAt: true, suspendedAt: true }
  });
  if (!user || user.deletedAt || user.suspendedAt || user.role !== "ADMIN") {
    return { ok: false, response: v1Error(403, "FORBIDDEN", "Admin access only") };
  }

  const device = await prisma.adminDevice.findUnique({ where: { id: claims.deviceId } });
  if (!device || device.userId !== user.id) {
    return { ok: false, response: v1Error(403, "FORBIDDEN", "Admin access only") };
  }
  if (device.status === "REVOKED") {
    return { ok: false, response: v1Error(403, "DEVICE_REVOKED", "This phone was signed out") };
  }
  if (device.status === "PENDING" && !opts?.allowPending) {
    return { ok: false, response: v1Error(403, "DEVICE_PENDING", "This phone is waiting for approval") };
  }

  const limit = await rateLimitDb({ key: `admin-api:${user.id}`, limit: 240, windowSeconds: 60 });
  if (!limit.ok) return { ok: false, response: v1Error(429, "RATE_LIMIT", "Too many attempts") };

  void prisma.adminDevice
    .update({ where: { id: device.id }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);

  return {
    ok: true,
    actor: {
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role },
      device: { id: device.id, status: device.status, name: device.name, platform: device.platform },
      ip: getClientIp(req.headers)
    }
  };
}

export async function requireStepUp(req: NextRequest, actor: AdminActor): Promise<AdminGate> {
  const header = req.headers.get("x-step-up");
  const claims = header ? verifyAccessToken(header) : null;
  if (!claims || claims.aud !== "admin-step-up" || claims.sub !== actor.user.id || claims.deviceId !== actor.device.id) {
    return { ok: false, response: v1Error(403, "STEP_UP_REQUIRED", "Enter the WhatsApp code to confirm this") };
  }
  return { ok: true, actor };
}
