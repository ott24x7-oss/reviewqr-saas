import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/whatsapp", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/whatsapp")>();
  return {
    ...actual,
    sendWhatsAppReport: vi.fn(async () => {
      throw new Error("WhatsApp is down");
    })
  };
});

import { prisma } from "../../lib/db";
import { claimDeliveries } from "../../lib/reports/delivery";
import { sendWeeklyToUser } from "../../lib/reports/run";

describe("weekly report retry", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.reportDelivery.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.reportPreference.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("frees both channel claims when the WhatsApp send throws, so a retry can send", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const owner = await prisma.user.create({
      data: { email: `report-retry-${stamp}@example.test`, phone: "9876500000" }
    });
    users.push(owner.id);
    await prisma.reportPreference.create({
      data: { userId: owner.id, emailOptIn: true, whatsappOptIn: true }
    });
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Retry Cafe", slug: `retry-${stamp}` }
    });
    const week = "2026-11-02";

    await expect(sendWeeklyToUser(owner.id, week)).rejects.toThrow("WhatsApp is down");

    expect(await claimDeliveries([business.id], week, "whatsapp")).toEqual([business.id]);
    expect(await claimDeliveries([business.id], week, "email")).toEqual([business.id]);
  });
});
