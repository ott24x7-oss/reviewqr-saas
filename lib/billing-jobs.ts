/**
 * Scheduled billing work: expire lapsed plans and send renewal reminders.
 * YouPI queues concurrent payments itself, so there is no local queue to promote.
 */
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "./db";
import { sendEmail } from "./email";
import { sendWhatsAppCloud } from "./whatsapp";
import { getWhatsAppConfig } from "./settings";
import { sendPushToUsers } from "./push";
import { absoluteUrl, formatINR } from "./utils";
import { approveDueCommissions } from "./plans/ledger";
import { readyToApprove } from "./plans/commission-rules";
import { notifyUser } from "./plans/notify";
import { applyDuePlanChanges, clearStalePendingPlans } from "./plans/downgrade";
import { applyDueReferralRewards } from "./plans/rewards";

const REMINDER_DAYS = [7, 3, 1, 0] as const;

export async function expireLapsedSubscriptions(onlyUserId?: string): Promise<number> {
  const now = new Date();
  if (!onlyUserId) {
    try {
      const pending = await prisma.shopCommission.findMany({
        where: { status: "PENDING" },
        select: { id: true, agentId: true, holdUntil: true, status: true, amountPaise: true }
      });
      const ready = pending.filter((row) => readyToApprove(row.status, row.holdUntil, now));
      await approveDueCommissions(now);
      for (const row of ready) {
        await notifyUser(
          row.agentId,
          "Commission approved",
          `${formatINR(row.amountPaise)} commission is approved and waiting for payout.`
        );
      }
      await applyDueReferralRewards(now);
    } catch (error) {
      console.warn("[plans] could not mature holds", error);
    }
  }
  try {
    await applyDuePlanChanges(now, onlyUserId);
  } catch (error) {
    console.warn("[plans] could not issue a pending-plan invoice", error);
  }
  const result = await prisma.user.updateMany({
    where: {
      ...(onlyUserId ? { id: onlyUserId } : {}),
      subscriptionTier: { not: "FREE" },
      subscriptionStatus: { in: ["ACTIVE", "PAST_DUE", "TRIALING"] },
      subscriptionEndsAt: { lt: now }
    },
    data: { subscriptionStatus: "EXPIRED" }
  });
  await prisma.subscription.updateMany({
    where: {
      ...(onlyUserId ? { userId: onlyUserId } : {}),
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      endsAt: { lt: now }
    },
    data: { status: "EXPIRED" }
  });
  await clearStalePendingPlans(now, onlyUserId);
  return result.count;
}

export async function sendRenewalReminders(): Promise<number> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: {
      subscriptionTier: { not: "FREE" },
      subscriptionStatus: { in: ["ACTIVE", "PAST_DUE", "TRIALING"] },
      subscriptionEndsAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), lte: horizon }
    },
    select: { id: true, email: true, name: true, phone: true, subscriptionEndsAt: true, subscriptionTier: true }
  });

  const wa = await getWhatsAppConfig().catch(() => null);
  let sent = 0;
  for (const user of users) {
    if (!user.subscriptionEndsAt) continue;
    const days = differenceInCalendarDays(user.subscriptionEndsAt, now);
    if (!REMINDER_DAYS.includes(days as (typeof REMINDER_DAYS)[number])) continue;
    const kind = `d${days}`;
    try {
      await prisma.subscriptionReminder.create({
        data: { userId: user.id, kind, periodEnd: user.subscriptionEndsAt }
      });
    } catch {
      continue;
    }

    const when = days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`;
    const payUrl = absoluteUrl("/dashboard/billing");
    const text = `Your QR24x7 ${user.subscriptionTier} plan ends ${when}. Renew here: ${payUrl}`;
    await sendEmail({
      to: user.email,
      subject: days === 0 ? "Your QR24x7 plan ends today" : `Your QR24x7 plan ends ${when}`,
      html: `<p>Hi ${user.name || "there"},</p><p>${text}</p>`
    }).catch(() => {});

    if (wa?.provider === "cloud-api" && user.phone) {
      await sendWhatsAppCloud({ to: user.phone, message: text }).catch(() => {});
    }
    await sendPushToUsers([user.id], {
      title: days === 0 ? "Your QR24x7 plan ends today" : `Your QR24x7 plan ends ${when}`,
      body: text,
      data: { type: "plan_reminder", kind }
    });
    sent++;
  }
  return sent;
}
