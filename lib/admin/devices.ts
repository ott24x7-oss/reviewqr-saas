import crypto from "crypto";
import { logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";

export function hashDeviceSecret(secret: string) {
  return crypto.createHash("sha256").update(secret, "utf8").digest("hex");
}

function secretMatches(secret: string, storedHash: string | null) {
  if (!storedHash) return false;
  const a = Buffer.from(hashDeviceSecret(secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * A device id alone proves nothing: it is sent in every token. An existing device is
 * reused only with the secret it was issued. Anything else opens a new PENDING device
 * and returns its secret once.
 */
export async function openAdminDevice(input: {
  userId: string;
  deviceId?: string | null;
  deviceSecret?: string | null;
  name: string;
  platform: string;
  pushToken?: string | null;
}) {
  const name = input.name.trim().slice(0, 80) || "Admin phone";
  const platform = input.platform.slice(0, 20) || "android";
  const pushToken = input.pushToken?.trim().slice(0, 240) || null;
  if (input.deviceId && input.deviceSecret) {
    const existing = await prisma.adminDevice.findUnique({ where: { id: input.deviceId } });
    if (
      existing &&
      existing.userId === input.userId &&
      existing.status !== "REVOKED" &&
      secretMatches(input.deviceSecret, existing.secretHash)
    ) {
      const device = await prisma.adminDevice.update({
        where: { id: existing.id },
        data: {
          name,
          platform,
          pushToken: pushToken ?? existing.pushToken,
          lastSeenAt: new Date()
        }
      });
      return { device, deviceSecret: null };
    }
  }
  const deviceSecret = crypto.randomBytes(32).toString("base64url");
  const device = await prisma.adminDevice.create({
    data: {
      userId: input.userId,
      name,
      platform,
      pushToken,
      secretHash: hashDeviceSecret(deviceSecret),
      status: "PENDING",
      lastSeenAt: new Date()
    }
  });
  return { device, deviceSecret };
}

export async function adminDeviceRows() {
  const rows = await prisma.adminDevice.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } }
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    platform: row.platform,
    status: row.status,
    lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
    adminName: row.user.name || row.user.email
  }));
}

export async function setAdminDeviceStatus(opts: {
  deviceId: string;
  action: "approve" | "revoke";
  actorId: string;
  ip?: string;
  actorDeviceId?: string | null;
  reason?: string | null;
}) {
  const device = await prisma.adminDevice.findUnique({ where: { id: opts.deviceId } });
  if (!device) return { ok: false as const, status: 404, error: "Device not found" };
  if (opts.action === "approve") {
    if (device.status === "REVOKED") {
      return { ok: false as const, status: 400, error: "Revoked devices need a new sign-in" };
    }
    if (device.status !== "ACTIVE") {
      await prisma.adminDevice.update({
        where: { id: device.id },
        data: { status: "ACTIVE", approvedById: opts.actorId }
      });
    }
    await logAudit({
      userId: opts.actorId,
      action: "admin.device",
      entity: "AdminDevice",
      entityId: device.id,
      deviceId: opts.actorDeviceId,
      ip: opts.ip,
      reason: opts.reason || null,
      before: { status: device.status },
      after: { status: "ACTIVE" },
      metadata: { op: "approve" }
    });
    return { ok: true as const };
  }
  if (device.status !== "REVOKED") {
    await prisma.$transaction([
      prisma.adminDevice.update({ where: { id: device.id }, data: { status: "REVOKED" } }),
      prisma.refreshSession.updateMany({
        where: { adminDeviceId: device.id, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);
  }
  await logAudit({
    userId: opts.actorId,
    action: "admin.device",
    entity: "AdminDevice",
    entityId: device.id,
    deviceId: opts.actorDeviceId,
    ip: opts.ip,
    reason: opts.reason || null,
    before: { status: device.status },
    after: { status: "REVOKED" },
    metadata: { op: "revoke" }
  });
  return { ok: true as const };
}

/** Ends admin-app refresh sessions. Devices stay in their current status. */
export async function signOutAllAdminDevices(actorId: string, ip?: string, actorDeviceId?: string | null) {
  const result = await prisma.refreshSession.updateMany({
    where: { audience: "admin", revokedAt: null },
    data: { revokedAt: new Date() }
  });
  await logAudit({
    userId: actorId,
    action: "admin.signout",
    entity: "RefreshSession",
    deviceId: actorDeviceId,
    ip,
    metadata: { count: result.count }
  });
  return result.count;
}
