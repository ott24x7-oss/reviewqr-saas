import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addDays, addMonths } from "date-fns";
import { prisma } from "../../lib/db";
import { applyDueReferralRewards, reverseReferralForPayment } from "../../lib/plans/rewards";
import { getPlanProgramSettings, savePlanProgramSettings, type PlanProgramSettings } from "../../lib/plans/settings";

const userIds: string[] = [];
let originalSettings: PlanProgramSettings | null = null;
let databaseAvailable = false;

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseAvailable = true;
    originalSettings = await getPlanProgramSettings();
    await savePlanProgramSettings({
      ...originalSettings,
      maxMonthsPerYear: 5,
      monthsByDuration: { ...originalSettings.monthsByDuration, YEAR_1: 2 }
    });
  } catch {
    databaseAvailable = false;
  }
});

afterAll(async () => {
  if (!databaseAvailable) return;
  try {
    if (userIds.length) {
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.referralReward.deleteMany({ where: { OR: [{ referrerUserId: { in: userIds } }, { referredUserId: { in: userIds } }] } });
      await prisma.signupAttribution.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.payment.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.referralCredit.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  } catch {
    // The local Postgres service may be unavailable during the requested checks.
  }
  if (originalSettings) await savePlanProgramSettings(originalSettings).catch(() => undefined);
});

async function makeUser(label: string, endsAt: Date | null = null) {
  const user = await prisma.user.create({
    data: {
      email: `referral-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@users.reviewqr.local`,
      phone: null,
      subscriptionTier: "GROWTH",
      subscriptionStatus: "ACTIVE",
      subscriptionEndsAt: endsAt,
      pushEnabled: false
    }
  });
  userIds.push(user.id);
  return user;
}

async function makeSubscription(userId: string, endsAt: Date) {
  return prisma.subscription.create({
    data: {
      userId,
      modules: ["REVIEWS", "MENU", "STORE"],
      limits: {},
      tier: "GROWTH",
      duration: "YEAR_1",
      status: "ACTIVE",
      startsAt: addDays(endsAt, -90),
      endsAt,
      pricePaise: 99900
    }
  });
}

async function makePayment(userId: string, status: "COMPLETED" | "REFUNDED" = "COMPLETED") {
  return prisma.payment.create({
    data: {
      userId,
      amount: 99900,
      status,
      tier: "GROWTH",
      periodMonths: 12,
      duration: "YEAR_1",
      modules: ["REVIEWS", "MENU", "STORE"],
      limits: {}
    }
  });
}

describe("owner referral rewards", () => {
  it("moves both stored expiry dates by exactly the awarded months", async (context) => {
    if (!databaseAvailable) context.skip();
    const now = new Date();
    const endsAt = addMonths(now, 4);
    const referrer = await makeUser("expiry", endsAt);
    const friend = await makeUser("expiry-friend");
    await makeSubscription(referrer.id, endsAt);
    const payment = await makePayment(friend.id);
    const reward = await prisma.referralReward.create({
      data: { referrerUserId: referrer.id, referredUserId: friend.id, paymentId: payment.id, months: 2, bonusDays: 0, holdUntil: addDays(now, -1) }
    });

    await applyDueReferralRewards(now, referrer.id);

    const [savedUser, savedSubscription, savedReward] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: referrer.id }, select: { subscriptionEndsAt: true } }),
      prisma.subscription.findFirstOrThrow({ where: { userId: referrer.id, status: "ACTIVE" }, select: { endsAt: true } }),
      prisma.referralReward.findUniqueOrThrow({ where: { id: reward.id }, select: { status: true, months: true } })
    ]);
    const expected = addMonths(endsAt, 2);
    expect(savedReward).toEqual({ status: "APPLIED", months: 2 });
    expect(savedUser.subscriptionEndsAt?.getTime()).toBe(expected.getTime());
    expect(savedSubscription.endsAt?.getTime()).toBe(expected.getTime());
  });

  it("limits the applied reward to the remaining yearly allowance", async (context) => {
    if (!databaseAvailable) context.skip();
    const now = new Date();
    const endsAt = addMonths(now, 5);
    const referrer = await makeUser("cap", endsAt);
    const priorFriend = await makeUser("cap-prior-friend");
    const friend = await makeUser("cap-friend");
    await makeSubscription(referrer.id, endsAt);
    const priorPayment = await makePayment(priorFriend.id);
    await prisma.referralReward.create({
      data: {
        referrerUserId: referrer.id,
        referredUserId: priorFriend.id,
        paymentId: priorPayment.id,
        months: 4,
        bonusDays: 0,
        holdUntil: addDays(now, -20),
        status: "APPLIED",
        appliedAt: new Date(now.getFullYear(), 0, 2)
      }
    });
    const payment = await makePayment(friend.id);
    const reward = await prisma.referralReward.create({
      data: { referrerUserId: referrer.id, referredUserId: friend.id, paymentId: payment.id, months: 2, bonusDays: 0, holdUntil: addDays(now, -1) }
    });

    await applyDueReferralRewards(now, referrer.id);

    const [savedReward, savedUser, savedSubscription] = await Promise.all([
      prisma.referralReward.findUniqueOrThrow({ where: { id: reward.id }, select: { status: true, months: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: referrer.id }, select: { subscriptionEndsAt: true } }),
      prisma.subscription.findFirstOrThrow({ where: { userId: referrer.id, status: "ACTIVE" }, select: { endsAt: true } })
    ]);
    const expected = addMonths(endsAt, 1);
    expect(savedReward).toEqual({ status: "APPLIED", months: 1 });
    expect(savedUser.subscriptionEndsAt?.getTime()).toBe(expected.getTime());
    expect(savedSubscription.endsAt?.getTime()).toBe(expected.getTime());
  });

  it("does not extend a plan when the referred payment is reversed", async (context) => {
    if (!databaseAvailable) context.skip();
    const now = new Date();
    const endsAt = addMonths(now, 3);
    const referrer = await makeUser("reversed", endsAt);
    const friend = await makeUser("reversed-friend");
    await makeSubscription(referrer.id, endsAt);
    const payment = await makePayment(friend.id, "REFUNDED");
    const reward = await prisma.referralReward.create({
      data: { referrerUserId: referrer.id, referredUserId: friend.id, paymentId: payment.id, months: 2, bonusDays: 0, holdUntil: addDays(now, -1) }
    });

    expect(await reverseReferralForPayment(payment.id, now)).toBe(1);
    await applyDueReferralRewards(now, referrer.id);

    const [savedReward, savedUser, savedSubscription] = await Promise.all([
      prisma.referralReward.findUniqueOrThrow({ where: { id: reward.id }, select: { status: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: referrer.id }, select: { subscriptionEndsAt: true } }),
      prisma.subscription.findFirstOrThrow({ where: { userId: referrer.id, status: "ACTIVE" }, select: { endsAt: true } })
    ]);
    expect(savedReward.status).toBe("REVERSED");
    expect(savedUser.subscriptionEndsAt?.getTime()).toBe(endsAt.getTime());
    expect(savedSubscription.endsAt?.getTime()).toBe(endsAt.getTime());
  });
});
