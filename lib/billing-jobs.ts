/**
 * Scheduled billing work: expire lapsed plans, send renewal reminders,
 * and promote the next queued YouPI payment when the VPA is free.
 */
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "./db";
import { sendEmail } from "./email";
import { sendWhatsAppCloud } from "./whatsapp";
import { getWhatsAppConfig } from "./settings";
import { absoluteUrl } from "./utils";
import { youpiCreatePayment, youpiConfigured, getYoupiConfig } from "./payments/youpi";

const REMINDER_DAYS = [7, 3, 1, 0] as const;

export async function expireLapsedSubscriptions(): Promise<number> {
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
    sent++;
  }
  return sent;
}

/** Start the oldest queued YouPI payment when none is already live. */
export async function promoteYoupiQueue(): Promise<{ promoted: boolean }> {
  const cfg = await getYoupiConfig();
  if (!youpiConfigured(cfg)) return { promoted: false };

  const live = await prisma.payment.findFirst({
    where: { provider: "YOUPI", status: "PENDING" },
    select: { id: true }
  });
  if (live) return { promoted: false };

  const next = await prisma.payment.findFirst({
    where: { provider: "YOUPI", status: "QUEUED" },
    orderBy: { createdAt: "asc" }
  });
  if (!next) return { promoted: false };

  const remote = await youpiCreatePayment({
    orderId: next.id,
    amountPaise: next.amount,
    returnUrl: absoluteUrl(`/dashboard/billing?payment=${next.id}`),
    idempotencyKey: next.id
  });
  await prisma.payment.update({
    where: { id: next.id },
    data: {
      status: "PENDING",
      providerPaymentId: remote.paymentId || undefined,
      providerOrderId: remote.orderId || next.id,
      checkoutUrl: remote.checkoutUrl || undefined,
      queuePosition: null,
      expiresAt: new Date(Date.now() + 45 * 60_000)
    }
  });
  return { promoted: true };
}
