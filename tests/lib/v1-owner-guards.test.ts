import { afterAll, describe, expect, it } from "vitest";
import { addLocation, createCampaign, inviteStaff, sendCampaign } from "../../lib/owner/mobile-extra";
import { loadCustomers } from "../../lib/store/customer-list";
import { prisma } from "../../lib/db";

describe("owner app guards", () => {
  const users: string[] = [];
  const stamp = () => `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

  afterAll(async () => {
    if (!users.length) return;
    await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function freeOwner() {
    const owner = await prisma.user.create({
      data: { email: `guard-${stamp()}@example.test`, role: "USER", subscriptionTier: "FREE" }
    });
    users.push(owner.id);
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Guard Cafe", slug: `guard-${stamp()}` }
    });
    return { owner, business };
  }

  async function member(businessId: string, role: "MANAGER" | "STAFF") {
    const user = await prisma.user.create({ data: { email: `m-${stamp()}@example.test`, role: "USER" } });
    users.push(user.id);
    await prisma.businessMember.create({ data: { businessId, userId: user.id, role } });
    return user;
  }

  it("keeps campaign sending off unless CAMPAIGN_SEND_ENABLED is 1", async () => {
    const { owner, business } = await freeOwner();
    const made = await createCampaign(owner.id, business.id, "Diwali", "Hi {name}");
    expect(made.ok).toBe(true);
    const previous = process.env.CAMPAIGN_SEND_ENABLED;
    delete process.env.CAMPAIGN_SEND_ENABLED;
    try {
      const sent = await sendCampaign(owner.id, business.id, made.ok ? made.data.id : "");
      expect(sent).toMatchObject({ ok: false, status: 403 });
    } finally {
      if (previous === undefined) delete process.env.CAMPAIGN_SEND_ENABLED;
      else process.env.CAMPAIGN_SEND_ENABLED = previous;
    }
  });

  it("applies the plan's location cap like the web route", async () => {
    const { owner, business } = await freeOwner();
    await prisma.location.create({ data: { businessId: business.id, name: "Main", slug: `main-${stamp()}` } });
    const extra = await addLocation(owner.id, business.id, "Second branch", "Delhi");
    expect(extra).toMatchObject({ ok: false, status: 402 });
    expect(await prisma.location.count({ where: { businessId: business.id } })).toBe(1);
  });

  it("lets only the owner invite staff", async () => {
    const { business } = await freeOwner();
    const manager = await member(business.id, "MANAGER");
    const res = await inviteStaff(manager.id, business.id, "new@example.test");
    expect(res).toMatchObject({ ok: false, status: 404 });
    expect(await prisma.businessInvite.count({ where: { businessId: business.id } })).toBe(0);
  });

  it("keeps customer phone numbers out of a STAFF export", async () => {
    const { owner, business } = await freeOwner();
    const staff = await member(business.id, "STAFF");
    const manager = await member(business.id, "MANAGER");
    await prisma.review.create({
      data: {
        businessId: business.id,
        rating: 5,
        sentiment: "POSITIVE",
        customerPhone: "9876543210",
        customerName: "Asha",
        consentAt: new Date()
      }
    });
    expect((await loadCustomers(owner.id, new Date(), business.id, "manage")).length).toBe(1);
    expect((await loadCustomers(manager.id, new Date(), business.id, "manage")).length).toBe(1);
    expect(await loadCustomers(staff.id, new Date(), business.id, "manage")).toEqual([]);
  });
});
