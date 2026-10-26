import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as auditGet } from "../../app/api/v1/admin/audit/route";
import { writeAdminAudit } from "../../lib/admin/audit-write";
import { signAccessToken } from "../../lib/auth/access-token";
import { prisma } from "../../lib/db";
import type { AdminActor } from "../../lib/admin/actor";

describe("admin audit", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.adminDevice.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("filters the log and keeps the admin, device, IP, and the change", async () => {
    const stamp = Date.now();
    const admin = await prisma.user.create({
      data: { email: `audit-${stamp}@example.test`, role: "ADMIN", name: "Audit Admin" }
    });
    users.push(admin.id);
    const device = await prisma.adminDevice.create({
      data: { userId: admin.id, name: "Audit phone", platform: "android", status: "ACTIVE" }
    });
    const actor: AdminActor = {
      user: { id: admin.id, email: admin.email, name: admin.name, phone: null, role: "ADMIN" },
      device: { id: device.id, status: "ACTIVE", name: device.name, platform: device.platform },
      ip: "10.8.8.8"
    };
    const req = new NextRequest("http://localhost/api/v1/admin/audit", { headers: { "user-agent": "vitest" } });
    const written = await writeAdminAudit(actor, req, {
      action: "payment.refund",
      entity: "Payment",
      entityId: `pay-${stamp}`,
      reason: "Customer asked",
      before: { status: "COMPLETED" },
      after: { status: "REFUNDED" },
      money: true
    });
    expect(written.ok).toBe(true);
    const missing = await writeAdminAudit(actor, req, { action: "payment.refund", entity: "Payment", money: true });
    expect(missing.ok).toBe(false);

    const token = signAccessToken({ sub: admin.id, role: "ADMIN", aud: "admin", deviceId: device.id }, undefined, undefined, 600);
    const res = await auditGet(
      new NextRequest(`http://localhost/api/v1/admin/audit?admin=${admin.id}&action=payment.refund&target=pay-${stamp}`, {
        headers: { authorization: `Bearer ${token}` }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]).toMatchObject({
      adminId: admin.id,
      deviceId: device.id,
      ip: "10.8.8.8",
      action: "payment.refund",
      entityId: `pay-${stamp}`,
      reason: "Customer asked",
      before: { status: "COMPLETED" },
      after: { status: "REFUNDED" }
    });
    const other = await auditGet(
      new NextRequest(`http://localhost/api/v1/admin/audit?action=user.note`, {
        headers: { authorization: `Bearer ${token}` }
      })
    );
    const empty = await other.json();
    expect(empty.data.items.some((row: { entityId: string }) => row.entityId === `pay-${stamp}`)).toBe(false);
  });
});
