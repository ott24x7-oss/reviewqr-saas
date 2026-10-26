import { afterAll, describe, expect, it } from "vitest";
import { csvCell, toCsv } from "../../lib/admin/csv";
import { listAdminCustomers } from "../../lib/admin/directory";
import { loadAdminDashboard } from "../../lib/admin/dashboard";
import { adminInboxBadge } from "../../lib/admin/inbox";
import { pageCommissionReport } from "../../lib/admin/money";
import { readOffset } from "../../lib/admin/directory";
import { spendWebStepToken, WEB_STEP_DEVICE } from "../../lib/admin/web-step";
import { signAccessToken, STEP_UP_TTL_SEC } from "../../lib/auth/access-token";
import { prisma } from "../../lib/db";

describe("admin directory", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.shopCommission.deleteMany({ where: { agentId: { in: users } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("rejects a bad page and escapes csv cells", () => {
    const page = readOffset(new URLSearchParams("page=nope"));
    expect(page.ok).toBe(false);
    expect(csvCell(`say "hi"`)).toBe(`"say ""hi"""`);
    expect(toCsv(["name"], [["Ada"]])).toContain("Ada");
  });

  it("spends a web step-up token once, for its own action, admin and the web device", async () => {
    const jti = `web-step-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sign = (deviceId: string, id = jti) =>
      signAccessToken(
        { sub: "user-1", role: "ADMIN", aud: "admin-step-up", deviceId, act: "refund_payment", jti: id },
        undefined,
        undefined,
        STEP_UP_TTL_SEC
      );
    const token = sign(WEB_STEP_DEVICE);
    expect(await spendWebStepToken(undefined, "user-1", "refund_payment")).toBe(false);
    expect(await spendWebStepToken(token, "user-2", "refund_payment")).toBe(false);
    expect(await spendWebStepToken(token, "user-1", "mark_payout_paid")).toBe(false);
    expect(await spendWebStepToken(sign("phone-1", `${jti}-p`), "user-1", "refund_payment")).toBe(false);
    expect(await spendWebStepToken(token, "user-1", "refund_payment")).toBe(true);
    expect(await spendWebStepToken(token, "user-1", "refund_payment")).toBe(false);
    await prisma.stepUpUse.deleteMany({ where: { jti } });
  });

  it("pages customers, masks phones, and exports the filter", async () => {
    const stamp = Date.now();
    const token = `dir${stamp}`;
    const created = [];
    for (let index = 0; index < 3; index += 1) {
      const user = await prisma.user.create({
        data: {
          email: `${token}-${index}@example.test`,
          name: `Directory ${token}`,
          phone: `900000000${index}`,
          role: "USER"
        }
      });
      users.push(user.id);
      created.push(user.id);
    }
    const first = await listAdminCustomers(new URLSearchParams(`q=${token}&limit=2&page=1`));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.total).toBe(3);
    expect(first.data.items).toHaveLength(2);
    expect(first.data.items.every((row) => row.phone.startsWith("••••") && !row.phone.includes("900000"))).toBe(true);
    const second = await listAdminCustomers(new URLSearchParams(`q=${token}&limit=2&page=2`));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.items).toHaveLength(1);
    const exported = await listAdminCustomers(new URLSearchParams(`q=${token}`), "export");
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.data.items).toHaveLength(3);
    expect(exported.data.items.map((row) => row.id).sort()).toEqual([...created].sort());
  });

  it("pages the commission ledger by agent code", async () => {
    const stamp = Date.now();
    const user = await prisma.user.create({
      data: { email: `pay-${stamp}@example.test`, name: "Payout Agent", role: "AGENT" }
    });
    users.push(user.id);
    const code = `p${String(stamp).slice(-8)}`;
    await prisma.agentProfile.create({ data: { userId: user.id, code, status: "ACTIVE" } });
    await prisma.shopCommission.create({
      data: { agentId: user.id, kind: "SALE", sourceId: `src-${stamp}`, amountPaise: 4200, percent: 10, status: "APPROVED" }
    });
    const listed = await pageCommissionReport(new URLSearchParams(`q=${code}&limit=20`));
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.data.total).toBe(1);
    expect(listed.data.items[0]?.approvedPaise).toBe(4200);
    expect(listed.data.items[0]?.phone).toBe("");
  });

  it("counts the inbox and loads the home dashboard within 1.5s", async () => {
    const before = await adminInboxBadge();
    expect(before).toBeGreaterThanOrEqual(0);
    const started = Date.now();
    const dash = await loadAdminDashboard(new URLSearchParams("range=7d"));
    expect(dash.ok).toBe(true);
    expect(Date.now() - started).toBeLessThan(1500);
  });
});
