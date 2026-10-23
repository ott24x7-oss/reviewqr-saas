import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { claimDeliveries, releaseDeliveries } from "../../lib/reports/delivery";

describe("weekly delivery claims", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.reportDelivery.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("claims a channel once per business and week, and a failed send can be retried", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const owner = await prisma.user.create({ data: { email: `report-del-${stamp}@example.test` } });
    users.push(owner.id);
    const first = await prisma.business.create({
      data: { ownerId: owner.id, name: "One", slug: `del-one-${stamp}` }
    });
    const second = await prisma.business.create({
      data: { ownerId: owner.id, name: "Two", slug: `del-two-${stamp}` }
    });
    const week = "2026-10-26";
    const claimed = await claimDeliveries([first.id, second.id], week, "email");
    expect(claimed.sort()).toEqual([first.id, second.id].sort());
    expect(await claimDeliveries([first.id, second.id], week, "email")).toEqual([]);
    expect(await claimDeliveries([first.id], week, "whatsapp")).toEqual([first.id]);
    await releaseDeliveries([second.id], week, "email");
    expect(await claimDeliveries([first.id, second.id], week, "email")).toEqual([second.id]);
  });
});
