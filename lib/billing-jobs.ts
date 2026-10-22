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
import { absoluteUrl } from "./utils";
import { approveDueCommissions } from "./plans/ledger";

const REMINDER_DAYS = [7, 3, 1, 0] as const;

export async function expireLapsedSubscriptions(): Promise<number> {
  await approveDueCommissions(new Date()).catch((error) => {
    console.warn("[plans] could not approve held commission", error);
    return 0;
  });
  const result = await prisma.user.updateMany({
    where: {
      subscriptionTier: { not: "FREE" },
      subscriptionStatus: { in: ["ACTIVE", "PAST_DUE"] },
      subscriptionEndsAt: { lt: new Date() }
    },
    data: { subscriptionStatus: "EXPIRED" }
  });
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
    const text = `Your ReviewQR ${user.subscriptionTier} plan ends ${when}. Renew here: ${payUrl}`;
    await sendEmail({
      to: user.email,
      subject: days === 0 ? "Your ReviewQR plan ends today" : `Your ReviewQR plan ends ${when}`,
      html: `<p>Hi ${user.name || "there"},</p><p>${text}</p>`
    }).catch(() => {});

    if (wa?.provider === "cloud-api" && user.phone) {
      await sendWhatsAppCloud({ to: user.phone, message: text }).catch(() => {});
    }
    await sendPushToUsers([user.id], {
      title: days === 0 ? "Your ReviewQR plan ends today" : `Your ReviewQR plan ends ${when}`,
      body: text,
      data: { type: "plan_reminder", kind }
    });
    sent++;
  }
  return sent;
}
