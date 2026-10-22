import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { holdUntil } from "./commission-rules";
import { extendByReward } from "./quote";
import {
  cappedRewardMonths,
  hasActivePaidPlan,
  referralBlockReason,
  rewardDestination,
  rewardMonthsFor
} from "./referral";
import { getPlanProgramSettings } from "./settings";
import { notifyUser } from "./notify";

async function addCredit(userId: string, months: number, days: number) {
  if (months <= 0 && days <= 0) return;
  await prisma.referralCredit.upsert({
    where: { userId },
    create: { userId, months, days },
    update: {
      ...(months > 0 ? { months: { increment: months } } : {}),
      ...(days > 0 ? { days: { increment: days } } : {})
    }
  });
}

async function pushEnd(userId: string, endsAt: Date) {
  await prisma.user.update({ where: { id: userId }, data: { subscriptionEndsAt: endsAt } });
  await prisma.subscription.updateMany({
    where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    data: { endsAt }
  });
}

export async function queueReferralReward(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { user: { select: { id: true, email: true, phone: true, subscriptionTier: true } } }
  });
  if (!payment || payment.status !== "COMPLETED" || payment.amount <= 0) return;
  const attribution = await prisma.signupAttribution.findUnique({ where: { userId: payment.userId } });
  if (!attribution?.referrerUserId) return;
  const existing = await prisma.referralReward.findUnique({ where: { referredUserId: payment.userId } });
  if (existing) return;

  const [settings, referrer, referrerPay] = await Promise.all([
    getPlanProgramSettings(),
    prisma.user.findUnique({
      where: { id: attribution.referrerUserId },
      select: { id: true, email: true, phone: true }
    }),
    prisma.payment.findFirst({
      where: { userId: attribution.referrerUserId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: { payerVpa: true, invoiceBuyerGstin: true }
    })
  ]);
  if (!referrer) return;
  const blocked = referralBlockReason(
    {
      id: referrer.id,
      email: referrer.email,
      phone: referrer.phone,
      gstin: referrerPay?.invoiceBuyerGstin,
      payerVpa: referrerPay?.payerVpa
    },
    {
      id: payment.user.id,
      email: payment.user.email,
      phone: payment.user.phone,
      gstin: payment.invoiceBuyerGstin,
      payerVpa: payment.payerVpa
    }
  );
  const months = blocked ? 0 : rewardMonthsFor(settings, payment.duration);
  const bonusDays = blocked ? 0 : settings.newBusinessDays;
  try {
    await prisma.referralReward.create({
      data: {
        referrerUserId: referrer.id,
        referredUserId: payment.userId,
        paymentId: payment.id,
        months,
        bonusDays,
        status: blocked ? "REVERSED" : "PENDING",
        holdUntil: holdUntil(new Date(), settings.holdDays),
        reversedAt: blocked ? new Date() : null
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
}

export async function applyDueReferralRewards(now = new Date()) {
  const due = await prisma.referralReward.findMany({
    where: { status: "PENDING", holdUntil: { lte: now } }
  });
  const settings = await getPlanProgramSettings();
  let applied = 0;
  for (const reward of due) {
    const payment = await prisma.payment.findUnique({ where: { id: reward.paymentId }, select: { status: true } });
    if (!payment || payment.status !== "COMPLETED") {
      await prisma.referralReward.updateMany({
        where: { id: reward.id, status: "PENDING" },
        data: { status: "REVERSED", reversedAt: now }
      });
      continue;
    }
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const used = await prisma.referralReward.aggregate({
      where: { referrerUserId: reward.referrerUserId, status: "APPLIED", appliedAt: { gte: yearStart } },
      _sum: { months: true }
    });
    const months = cappedRewardMonths(reward.months, used._sum.months || 0, settings.maxMonthsPerYear);
    const referrer = await prisma.user.findUnique({
      where: { id: reward.referrerUserId },
      select: { subscriptionTier: true, subscriptionStatus: true, subscriptionEndsAt: true }
    });
    const referred = await prisma.user.findUnique({
      where: { id: reward.referredUserId },
      select: { subscriptionEndsAt: true }
    });
    if (!referrer || !referred) continue;
    const extend = rewardDestination(
      hasActivePaidPlan({
        tier: referrer.subscriptionTier,
        status: referrer.subscriptionStatus,
        endsAt: referrer.subscriptionEndsAt,
        now
      })
    ) === "extend" && !!referrer.subscriptionEndsAt;
    const claimed = await prisma.referralReward.updateMany({
      where: { id: reward.id, status: "PENDING" },
      data: { status: "APPLIED", appliedAt: now, months, asCredit: !extend && months > 0 }
    });
    if (claimed.count !== 1) continue;
    if (months > 0 && extend && referrer.subscriptionEndsAt) {
      const next = extendByReward(referrer.subscriptionEndsAt, months, 0);
      if (next) await pushEnd(reward.referrerUserId, next);
    } else if (months > 0) {
      await addCredit(reward.referrerUserId, months, 0);
    }
    if (reward.bonusDays > 0 && referred.subscriptionEndsAt) {
      const next = extendByReward(referred.subscriptionEndsAt, 0, reward.bonusDays);
      if (next) await pushEnd(reward.referredUserId, next);
    } else if (reward.bonusDays > 0) {
      await addCredit(reward.referredUserId, 0, reward.bonusDays);
    }
    if (months > 0) {
      await notifyUser(
        reward.referrerUserId,
        "Referral reward added",
        extend
          ? `Your plan is now ${months} month${months === 1 ? "" : "s"} longer. Thank you for the referral.`
          : `${months} free month${months === 1 ? "" : "s"} are saved as credit for your next plan.`
      );
    }
    applied += 1;
  }
  return applied;
}

export async function reverseReferralForPayment(paymentId: string, now = new Date()) {
  const reward = await prisma.referralReward.findUnique({ where: { paymentId } });
  if (!reward || reward.status === "REVERSED") return 0;
  if (reward.status === "APPLIED" && reward.holdUntil.getTime() < now.getTime()) return 0;
  const updated = await prisma.referralReward.updateMany({
    where: { id: reward.id, status: "PENDING" },
    data: { status: "REVERSED", reversedAt: now }
  });
  return updated.count;
}
