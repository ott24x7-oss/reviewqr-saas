import type { Prisma } from "@prisma/client";
import { backfillBusiness, backfillRollups, rollupAllBusinesses, rollupBusinessDay, rollupJobDays } from "../analytics/build";
import { istDayKey, istParts } from "../analytics/ist";
import { scoreAllBusinesses } from "../growth/compute";
import { enqueueMonthlySends, enqueueWeeklySends, sendMonthlyToUser, sendWeeklyToUser } from "../reports/run";
import { expireLapsedSubscriptions, sendRenewalReminders } from "../billing-jobs";
import { expireStale, reconcileAllPending } from "../manual-payments";
import { deliverNegativeFeedback } from "../notify";
import { sendPushToUsers, type PushPayload } from "../push";
import { deliverNewOrder, deliverOrderStatus } from "../store/order-alert";
import type { OrderStatus } from "../store/order-status";
import { runShopJob } from "../shop/ship-order";
import type { ClaimedJob } from "./store";

function record(payload: Prisma.JsonValue) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Job payload is empty");
  }
  return payload as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function handleJob(job: ClaimedJob) {
  const payload = record(job.payload);
  switch (job.type) {
    case "notify.order":
      await deliverNewOrder({
        businessId: text(payload.businessId),
        ownerId: text(payload.ownerId),
        number: text(payload.number),
        businessName: text(payload.businessName),
        totalPaise: Number(payload.totalPaise) || 0,
        orderId: text(payload.orderId)
      });
      return { ok: true };
    case "notify.orderStatus":
      await deliverOrderStatus({
        businessId: text(payload.businessId),
        ownerId: text(payload.ownerId),
        number: text(payload.number),
        businessName: text(payload.businessName),
        status: text(payload.status) as OrderStatus,
        orderId: text(payload.orderId)
      });
      return { ok: true };
    case "notify.feedback":
      await deliverNegativeFeedback({
        businessId: text(payload.businessId),
        reviewId: text(payload.reviewId),
        rating: Number(payload.rating) || 0,
        message: text(payload.message),
        customerName: text(payload.customerName) || undefined,
        customerPhone: text(payload.customerPhone) || undefined,
        customerEmail: text(payload.customerEmail) || undefined
      });
      return { ok: true };
    case "push.send": {
      const userIds = Array.isArray(payload.userIds) ? payload.userIds.filter((id): id is string => typeof id === "string") : [];
      const message: PushPayload = {
        title: text(payload.title),
        body: text(payload.body),
        data:
          payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
            ? Object.fromEntries(
                Object.entries(payload.data as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")])
              )
            : undefined
      };
      await sendPushToUsers(userIds, message);
      return { ok: true };
    }
    case "billing.reconcile":
      return reconcileAllPending();
    case "billing.expireStale":
      return expireStale();
    case "billing.expireLapsed":
      return expireLapsedSubscriptions();
    case "billing.reminders":
      return sendRenewalReminders();
    case "analytics.rollup": {
      const now = new Date();
      const today = istDayKey(now);
      const day = text(payload.day) || today;
      const businessId = text(payload.businessId);
      if (businessId) return rollupBusinessDay(businessId, day);
      const days = day === today ? rollupJobDays(today, istParts(now).hour) : [day];
      let businesses = 0;
      for (const key of days) businesses = await rollupAllBusinesses(key);
      return { businesses, days };
    }
    case "analytics.backfill": {
      const days = Number(payload.days) || 90;
      const businessId = text(payload.businessId);
      if (!businessId) return backfillRollups(days);
      return backfillBusiness(businessId, days);
    }
    case "growth.score":
      return scoreAllBusinesses();
    case "reports.weekly":
      return enqueueWeeklySends(text(payload.weekKey));
    case "reports.weekly.send":
      return sendWeeklyToUser(text(payload.userId), text(payload.weekKey));
    case "reports.monthly":
      return enqueueMonthlySends(text(payload.monthKey));
    case "reports.monthly.send":
      return sendMonthlyToUser(text(payload.userId), text(payload.monthKey));
    case "shop.ship":
    case "shop.label":
    case "shop.track":
    case "shop.notify":
      return runShopJob(job.type, payload);
    case "print.export":
      throw new Error("Print export must run in the download request");
    default:
      throw new Error(`Unknown job type ${job.type}`);
  }
}
