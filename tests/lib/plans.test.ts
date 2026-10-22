import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { isCombo, pricingTab, savingsPercent } from "../../lib/plans/catalog";
import { limitsForTier, modulesForTier, snapshotGrants } from "../../lib/plans/legacy";
import { ensureLegacySubscription } from "../../lib/plans/backfill";
import { hasModule, limit } from "../../lib/plans/entitlements";
import { prorateCredit, quotePlanChange } from "../../lib/plans/quote";
import { commissionAmount, pickCommissionRule, readyToApprove, renewalStillPays } from "../../lib/plans/commission-rules";
import { approveDueCommissions, recordCommission, reverseCommissionsForPayment } from "../../lib/plans/ledger";
import {
  cappedRewardMonths,
  chooseAttribution,
  hasActivePaidPlan,
  referralBlockReason,
  rewardDestination,
  rewardMonthsFor,
  DEFAULT_REWARD_TABLE
} from "../../lib/plans/referral";

describe("plan modules and legacy tiers", () => {
  it("treats two or more modules as a combo and files the pricing tab", () => {
    expect(isCombo(["REVIEWS"])).toBe(false);
    expect(isCombo(["REVIEWS", "MENU"])).toBe(true);
    expect(pricingTab(["REVIEWS"])).toBe("reviews");
    expect(pricingTab(["REVIEWS", "MENU"])).toBe("reviews-menu");
    expect(pricingTab(["STORE"])).toBe("store");
    expect(pricingTab(["REVIEWS", "MENU", "STORE"])).toBe("all");
  });

  it("maps old tiers onto modules without shrinking paid limits", () => {
    expect(modulesForTier("FREE")).toEqual(["REVIEWS"]);
    for (const tier of ["STARTER", "GROWTH", "AGENCY", "FOUNDER"] as const) {
      expect(modulesForTier(tier)).toEqual(["REVIEWS", "MENU", "STORE"]);
      expect(limitsForTier(tier).businesses).toBeGreaterThan(0);
      expect(limitsForTier(tier).products).toBe(100000);
    }
    expect(limitsForTier("FREE").qrCodes).toBe(2);
    expect(limitsForTier("GROWTH").businesses).toBe(5);
    expect(savingsPercent({ pricePaise: 999900, mrpPaise: 1198800 })).toBe(17);
  });

  it("keeps a founder grant and drops an ended paid snapshot", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    expect(snapshotGrants({ tier: "FOUNDER", status: "ACTIVE", endsAt: null, now })).toBe(true);
    expect(
      snapshotGrants({ tier: "GROWTH", status: "ACTIVE", endsAt: new Date("2026-05-01T00:00:00Z"), now })
    ).toBe(false);
    expect(
      snapshotGrants({ tier: "GROWTH", status: "ACTIVE", endsAt: new Date("2026-07-01T00:00:00Z"), now })
    ).toBe(true);
  });
});

describe("old-tier users on a database", () => {
  const created: string[] = [];
  afterAll(async () => {
    if (!created.length) return;
    await prisma.subscription.deleteMany({ where: { userId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  });

  it("copies a pre-plan Growth user onto all modules and keeps the end date", async () => {
    const endsAt = new Date("2027-04-01T00:00:00Z");
    const user = await prisma.user.create({
      data: {
        email: `old-growth-${Date.now()}@example.test`,
        subscriptionTier: "GROWTH",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: endsAt
      }
    });
    created.push(user.id);
    const row = await ensureLegacySubscription(user.id);
    expect(row?.modules).toEqual(["REVIEWS", "MENU", "STORE"]);
    expect(row?.endsAt?.toISOString()).toBe(endsAt.toISOString());
    expect(row?.tier).toBe("GROWTH");
    const again = await ensureLegacySubscription(user.id);
    expect(again?.id).toBe(row?.id);
  });

  it("copies a free user as reviews only", async () => {
    const user = await prisma.user.create({
      data: {
        email: `old-free-${Date.now()}@example.test`,
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE"
      }
    });
    created.push(user.id);
    const row = await ensureLegacySubscription(user.id);
    expect(row?.modules).toEqual(["REVIEWS"]);
    expect(row?.planId).toBe("plan_legacy_free");
  });
});

describe("pro-rate and plan changes", () => {
  it("credits the unused half of a paid period and charges the difference", () => {
    const startsAt = new Date("2026-01-01T00:00:00Z");
    const endsAt = new Date("2026-03-01T00:00:00Z");
    const now = new Date("2026-02-01T00:00:00Z");
    const credit = prorateCredit({ pricePaidPaise: 10000, startsAt, endsAt, now });
    expect(credit).toBeGreaterThan(4000);
    expect(credit).toBeLessThan(6000);
    expect(quotePlanChange({ samePlan: false, currentPricePaise: 49900, targetPricePaise: 99900, creditPaise: credit })).toMatchObject({
      kind: "upgrade"
    });
    expect(quotePlanChange({ samePlan: false, currentPricePaise: 99900, targetPricePaise: 49900, creditPaise: credit }).kind).toBe(
      "downgrade"
    );
    expect(quotePlanChange({ samePlan: true, currentPricePaise: 49900, targetPricePaise: 49900, creditPaise: credit })).toEqual({
      kind: "renew",
      duePaise: 49900,
      creditPaise: 0
    });
    expect(prorateCredit({ pricePaidPaise: 2499900, startsAt, endsAt: null, now })).toBe(2499900);
  });
});

describe("commission rules", () => {
  const base = {
    hardware: false,
    active: true,
    firstBasis: "PERCENT" as const,
    firstPercent: 10,
    firstFlatPaise: 0,
    renewalBasis: "PERCENT" as const,
    renewalPercent: 5,
    renewalFlatPaise: 0,
    renewalMonths: null as number | null
  };

  it("prefers a per-plan rule over a per-agent rule over the default", () => {
    const picked = pickCommissionRule(
      [
        { ...base, agentId: null, planId: null, firstPercent: 10 },
        { ...base, agentId: "agent", planId: null, firstPercent: 20 },
        { ...base, agentId: null, planId: "plan", firstPercent: 30 }
      ],
      { agentId: "agent", planId: "plan", hardware: false }
    );
    expect(picked?.firstPercent).toBe(30);
    const agentOnly = pickCommissionRule(
      [
        { ...base, agentId: null, planId: null, firstPercent: 10 },
        { ...base, agentId: "agent", planId: null, firstPercent: 20 }
      ],
      { agentId: "agent", planId: "plan", hardware: false }
    );
    expect(agentOnly?.firstPercent).toBe(20);
    expect(commissionAmount("FLAT", 0, 15000, 99900)).toBe(15000);
    expect(commissionAmount("PERCENT", 10, 0, 99900)).toBe(9990);
    expect(renewalStillPays({ renewalMonths: 3, firstPaidAt: new Date("2026-01-01T00:00:00Z"), now: new Date("2026-03-01T00:00:00Z") })).toBe(
      true
    );
    expect(renewalStillPays({ renewalMonths: 1, firstPaidAt: new Date("2026-01-01T00:00:00Z"), now: new Date("2026-03-01T00:00:00Z") })).toBe(
      false
    );
  });
});

describe("commission ledger", () => {
  const created: string[] = [];
  afterAll(async () => {
    await prisma.shopCommission.deleteMany({ where: { agentId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  });

  it("writes one pending row, ignores a repeat, approves after the hold, and reverses a refund", async () => {
    const agent = await prisma.user.create({
      data: { email: `ledger-agent-${Date.now()}@example.test`, role: "AGENT" }
    });
    created.push(agent.id);
    const sourceId = `pay_${Date.now()}`;
    const first = await recordCommission({
      agentId: agent.id,
      kind: "RENEWAL",
      sourceId,
      paymentId: null,
      amountPaise: 5000,
      percent: 10,
      saleKind: "FIRST",
      holdUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    const second = await recordCommission({
      agentId: agent.id,
      kind: "RENEWAL",
      sourceId,
      amountPaise: 9999,
      percent: 99
    });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.row.id).toBe(first.row.id);
    expect(second.row.amountPaise).toBe(5000);
    expect(readyToApprove("PENDING", first.row.holdUntil, new Date())).toBe(false);
    expect(await approveDueCommissions(new Date(), agent.id)).toBe(0);
    const approved = await approveDueCommissions(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), agent.id);
    expect(approved).toBe(1);
    const after = await prisma.shopCommission.findUnique({ where: { id: first.row.id } });
    expect(after?.status).toBe("APPROVED");

    const payer = await prisma.user.create({
      data: { email: `ledger-payer-${Date.now()}@example.test` }
    });
    created.push(payer.id);
    const payment = await prisma.payment.create({
      data: { userId: payer.id, amount: 100, tier: "STARTER", status: "COMPLETED", provider: "MANUAL" }
    });
    const linked = await recordCommission({
      agentId: agent.id,
      kind: "RENEWAL",
      sourceId: payment.id,
      paymentId: payment.id,
      amountPaise: 1000,
      percent: 10,
      holdUntil: new Date(Date.now() + 86_400_000)
    });
    expect(await reverseCommissionsForPayment(payment.id)).toBe(1);
    const reversed = await prisma.shopCommission.findUnique({ where: { id: linked.row.id } });
    expect(reversed?.status).toBe("REVERSED");
    expect(await approveDueCommissions(new Date(Date.now() + 10 * 86_400_000), agent.id)).toBe(0);
    const still = await prisma.shopCommission.findUnique({ where: { id: linked.row.id } });
    expect(still?.status).toBe("REVERSED");
    await prisma.shopCommission.deleteMany({ where: { paymentId: payment.id } });
    await prisma.payment.delete({ where: { id: payment.id } });
  });
});

describe("referral rewards", () => {
  it("reads the editable table, blocks self-referral, and stores credit without a paid plan", () => {
    expect(rewardMonthsFor(DEFAULT_REWARD_TABLE, "MONTH_1")).toBe(0);
    expect(rewardMonthsFor(DEFAULT_REWARD_TABLE, "MONTH_6")).toBe(1);
    expect(rewardMonthsFor(DEFAULT_REWARD_TABLE, "YEAR_1")).toBe(2);
    expect(rewardMonthsFor(DEFAULT_REWARD_TABLE, "LIFETIME")).toBe(3);
    expect(cappedRewardMonths(2, 23, 24)).toBe(1);
    expect(chooseAttribution({ agentCode: true, ownerCode: true })).toBe("agent");
    expect(chooseAttribution({ agentCode: false, ownerCode: true })).toBe("owner");
    expect(referralBlockReason({ id: "a", phone: "+91 98100 11111" }, { id: "b", phone: "9810011111" })).toBe("same-phone");
    expect(referralBlockReason({ id: "a", email: "A@Example.com" }, { id: "b", email: "a@example.com" })).toBe("same-email");
    expect(referralBlockReason({ id: "a", gstin: "29AABCU9603R1ZM" }, { id: "b", gstin: "29aabcu9603r1zm" })).toBe("same-gstin");
    expect(referralBlockReason({ id: "a", payerVpa: "shop@upi" }, { id: "b", payerVpa: "SHOP@upi" })).toBe("same-upi");
    expect(referralBlockReason({ id: "a", email: "a@example.com" }, { id: "b", email: "b@example.com" })).toBeNull();
    expect(rewardDestination(false)).toBe("credit");
    expect(rewardDestination(true)).toBe("extend");
    expect(hasActivePaidPlan({ tier: "GROWTH", status: "TRIALING", endsAt: new Date(Date.now() + 86_400_000) })).toBe(false);
    expect(hasActivePaidPlan({ tier: "STARTER", status: "ACTIVE", endsAt: new Date(Date.now() + 86_400_000) })).toBe(true);
  });
});

describe("entitlements per module", () => {
  const created: string[] = [];
  afterAll(async () => {
    if (!created.length) return;
    await prisma.subscription.deleteMany({ where: { userId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  });

  it("keeps reviews on a free account and the snapshot modules on a paid account", async () => {
    const free = await prisma.user.create({
      data: {
        email: `ent-free-${Date.now()}@example.test`,
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE"
      }
    });
    created.push(free.id);
    expect(await hasModule(free.id, "REVIEWS")).toBe(true);
    expect(await hasModule(free.id, "STORE")).toBe(false);
    expect(await limit(free.id, "qrCodes")).toBe(2);

    const trial = await prisma.user.create({
      data: {
        email: `ent-trial-${Date.now()}@example.test`,
        subscriptionTier: "GROWTH",
        subscriptionStatus: "TRIALING",
        trialEndsAt: new Date(Date.now() + 7 * 86_400_000)
      }
    });
    created.push(trial.id);
    expect(await hasModule(trial.id, "MENU")).toBe(true);
    expect(await hasModule(trial.id, "STORE")).toBe(true);

    const endsAt = new Date("2027-08-01T00:00:00Z");
    const paid = await prisma.user.create({
      data: {
        email: `ent-paid-${Date.now()}@example.test`,
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: endsAt
      }
    });
    created.push(paid.id);
    await prisma.subscription.create({
      data: {
        userId: paid.id,
        modules: ["STORE"],
        limits: {
          businesses: 1,
          qrCodes: 4,
          products: 12,
          staff: 1,
          aiCalls: 5,
          locations: 1,
          reviews: 50,
          campaigns: 1,
          reviewTemplates: 10,
          storeProducts: 12,
          storeOrders: 100000,
          aiCallsPerMonth: 5
        },
        tier: "STARTER",
        status: "ACTIVE",
        endsAt
      }
    });
    expect(await hasModule(paid.id, "STORE")).toBe(true);
    expect(await hasModule(paid.id, "MENU")).toBe(false);
    expect(await limit(paid.id, "products")).toBe(12);
  });
});
