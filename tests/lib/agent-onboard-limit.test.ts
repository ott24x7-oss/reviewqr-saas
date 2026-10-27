import { afterAll, describe, expect, it, vi } from "vitest";

const requestSignupOtp = vi.hoisted(() =>
  vi.fn(async () => ({ ok: true as const, channel: "dev" as const, issuedCode: "123456" }))
);
vi.mock("../../lib/otp", async () => {
  const actual = await vi.importActual<typeof import("../../lib/otp")>("../../lib/otp");
  return { ...actual, requestSignupOtp };
});

import { prisma } from "../../lib/db";
import { startAgentOnboarding } from "../../lib/plans/agents";

const base = Date.now() % 1_000_000;

function phoneAt(n: number) {
  return `98${String(base + n).padStart(8, "0").slice(-8)}`;
}

describe("agent onboarding OTP limits", () => {
  const users: string[] = [];
  const phones: string[] = [];

  afterAll(async () => {
    const keys = [
      ...users.map((id) => `agent-onboard-agent:${id}`),
      ...phones.map((phone) => `agent-onboard-phone:${phone}`)
    ];
    if (keys.length) await prisma.rateLimit.deleteMany({ where: { key: { in: keys } } });
    if (!users.length) return;
    await prisma.agentOnboarding.deleteMany({ where: { agentId: { in: users } } });
    await prisma.agentProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function agent(label: string) {
    const stamp = `${label}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const user = await prisma.user.create({
      data: { email: `${stamp}@example.test`, role: "AGENT", phone: "9000000001" }
    });
    users.push(user.id);
    await prisma.agentProfile.create({
      data: { userId: user.id, code: stamp.replace(/[^a-z0-9]/gi, "").slice(0, 16).toUpperCase(), active: true }
    });
    return user;
  }

  it("stops a phone after 5 onboarding codes in an hour", async () => {
    requestSignupOtp.mockClear();
    const user = await agent("phone-cap");
    const phone = phoneAt(1);
    phones.push(phone);
    for (let i = 0; i < 5; i += 1) {
      const sent = await startAgentOnboarding(user.id, phone, "Cafe One");
      expect(sent.ok, JSON.stringify(sent)).toBe(true);
    }
    const blocked = await startAgentOnboarding(user.id, phone, "Cafe One");
    expect(blocked).toEqual({ ok: false, error: "Too many attempts" });
    expect(requestSignupOtp).toHaveBeenCalledTimes(5);
    expect(await prisma.agentOnboarding.count({ where: { agentId: user.id } })).toBe(5);
  });

  it("stops an agent after 10 onboarding codes in an hour", async () => {
    requestSignupOtp.mockClear();
    const user = await agent("agent-cap");
    for (let i = 0; i < 10; i += 1) {
      const phone = phoneAt(100 + i);
      phones.push(phone);
      const sent = await startAgentOnboarding(user.id, phone, "Cafe Two");
      expect(sent.ok, JSON.stringify(sent)).toBe(true);
    }
    const extra = phoneAt(200);
    phones.push(extra);
    const blocked = await startAgentOnboarding(user.id, extra, "Cafe Two");
    expect(blocked).toEqual({ ok: false, error: "Too many attempts" });
    expect(requestSignupOtp).toHaveBeenCalledTimes(10);
    expect(await prisma.agentOnboarding.count({ where: { agentId: user.id } })).toBe(10);
  });
});
