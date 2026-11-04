import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const whatsapp = vi.hoisted(() => ({
  ready: true,
  send: vi.fn()
}));

vi.mock("../../lib/whatsapp", async () => {
  const actual = await vi.importActual<typeof import("../../lib/whatsapp")>("../../lib/whatsapp");
  return {
    ...actual,
    isAutomatedWhatsAppReady: async () => whatsapp.ready,
    sendWhatsApp: whatsapp.send
  };
});

import { createCampaign, sendCampaign } from "../../lib/owner/mobile-extra";
import { prisma } from "../../lib/db";

const LIMITS = {
  businesses: 2,
  qrCodes: 5,
  products: 20,
  staff: 5,
  aiCalls: 5,
  aiCallsPerMonth: 5,
  locations: 2,
  reviews: 100,
  campaigns: 5,
  reviewTemplates: 10,
  storeProducts: 20,
  storeOrders: 100
};

describe("shared campaign send service", () => {
  const userIds: string[] = [];
  const businessIds: string[] = [];
  const planIds: string[] = [];

  beforeEach(() => {
    whatsapp.ready = true;
    whatsapp.send.mockReset();
  });

  afterAll(async () => {
    if (businessIds.length) await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    if (userIds.length) {
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (planIds.length) await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  });

  async function setup() {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const endsAt = new Date("2027-08-01T00:00:00.000Z");
    const user = await prisma.user.create({
      data: {
        email: `campaign-send-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: endsAt
      }
    });
    userIds.push(user.id);
    const plan = await prisma.plan.create({
      data: {
        nameEn: "Campaign plan",
        nameHi: "कैंपेन प्लान",
        slug: `campaign-send-${stamp}`,
        modules: ["REVIEWS"],
        limits: LIMITS,
        legacyTier: "STARTER"
      }
    });
    planIds.push(plan.id);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        modules: ["REVIEWS"],
        limits: LIMITS,
        tier: "STARTER",
        status: "ACTIVE",
        endsAt
      }
    });
    const business = await prisma.business.create({
      data: { ownerId: user.id, name: "Campaign cafe", slug: `campaign-send-${stamp}` }
    });
    businessIds.push(business.id);
    const created = await createCampaign(user.id, business.id, "Return visit", "Hi {name}, come see us again.");
    if (!created.ok) throw new Error(created.error);
    return { user, business, campaignId: created.data.id };
  }

  it("sends only to consented contacts, up to 30 per call, and skips click-to-chat fallbacks", async () => {
    const { user, business, campaignId } = await setup();
    const allowedPhones = new Set<string>();
    const consentAt = new Date();
    for (let index = 0; index < 31; index++) {
      const phone = `91${String(700000000 + index).padStart(9, "0")}`;
      allowedPhones.add(phone);
      await prisma.contact.create({ data: { businessId: business.id, name: `Customer ${index}`, phone } });
      await prisma.review.create({
        data: {
          businessId: business.id,
          rating: 5,
          sentiment: "POSITIVE",
          customerPhone: phone,
          consentAt
        }
      });
    }
    const noConsentPhone = "919876543210";
    await prisma.contact.create({ data: { businessId: business.id, name: "No consent", phone: noConsentPhone } });
    await prisma.review.create({
      data: { businessId: business.id, rating: 5, sentiment: "POSITIVE", customerPhone: noConsentPhone }
    });

    whatsapp.send.mockImplementation(async () => {
      const callNumber = whatsapp.send.mock.calls.length;
      return callNumber % 2 === 0
        ? { ok: true as const, via: "cloud" as const }
        : { ok: true as const, via: "click-to-chat" as const, url: "https://wa.me/" };
    });
    const oldFlag = process.env.CAMPAIGN_SEND_ENABLED;
    delete process.env.CAMPAIGN_SEND_ENABLED;
    try {
      const result = await sendCampaign(user.id, business.id, campaignId);
      expect(result).toMatchObject({ ok: true, data: { sent: 15, skipped: 15 } });
      expect(whatsapp.send).toHaveBeenCalledTimes(30);
      const recipients = whatsapp.send.mock.calls.map(([payload]) => payload.to as string);
      expect(recipients.every((phone) => allowedPhones.has(phone))).toBe(true);
      expect(recipients).not.toContain(noConsentPhone);
      expect(await prisma.campaignContact.count({ where: { campaignId, sentAt: { not: null } } })).toBe(15);
      expect((await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } })).sent).toBe(15);
    } finally {
      if (oldFlag === undefined) delete process.env.CAMPAIGN_SEND_ENABLED;
      else process.env.CAMPAIGN_SEND_ENABLED = oldFlag;
    }
  });

  it("returns an actionable message when no automated WhatsApp provider is connected", async () => {
    const { user, business, campaignId } = await setup();
    whatsapp.ready = false;

    const result = await sendCampaign(user.id, business.id, campaignId);

    expect(result).toMatchObject({ ok: false, status: 403, error: "Connect WhatsApp in admin first" });
    expect(whatsapp.send).not.toHaveBeenCalled();
  });

  it("limits campaign sends to three calls per hour", async () => {
    const { user, business, campaignId } = await setup();

    const first = await sendCampaign(user.id, business.id, campaignId);
    const second = await sendCampaign(user.id, business.id, campaignId);
    const third = await sendCampaign(user.id, business.id, campaignId);
    const fourth = await sendCampaign(user.id, business.id, campaignId);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(true);
    expect(fourth).toMatchObject({ ok: false, status: 429, error: "Too many campaign sends. Try again later." });
  });
});
