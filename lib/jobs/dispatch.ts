import type { Prisma } from "@prisma/client";
import { istDayKey, istParts } from "../analytics/ist";
import { monthlyDue, weeklyDue } from "../reports/schedule";
import { getInsightSettings } from "../reports/settings";
import {
  claimById,
  enqueueJob,
  enqueueOpen,
  markDone,
  markRetry,
  webWorkerId,
  workerIsFresh
} from "./store";

export async function dispatchJob(type: string, payload: Prisma.InputJsonValue, idempotencyKey?: string) {
  const job = await enqueueJob({ type, payload, idempotencyKey });
  if (job.status !== "PENDING") return job;
  if (await workerIsFresh()) return job;
  await runClaimedJob(job.id);
  return job;
}

export async function runClaimedJob(id: string, worker = webWorkerId()) {
  const job = await claimById(id, worker);
  if (!job) return null;
  try {
    const { handleJob } = await import("./handlers");
    const result = await handleJob(job);
    await markDone(job.id);
    return result;
  } catch (error) {
    await markRetry(job.id, error instanceof Error ? error.message : "Job failed");
    throw error;
  }
}

/** Claim in the same transaction as the insert, then run `work` before returning. */
export async function runInlineJob<T>(
  type: string,
  payload: Prisma.InputJsonValue,
  work: () => Promise<T>,
  opts?: { maxAttempts?: number }
) {
  const { prisma } = await import("../db");
  const worker = webWorkerId();
  const job = await prisma.$transaction(async (tx) => {
    const created = await enqueueJob({ type, payload, maxAttempts: opts?.maxAttempts ?? 1 }, tx);
    const claimed = await claimById(created.id, worker, tx);
    if (!claimed) throw new Error("Could not claim job");
    return claimed;
  });
  try {
    const result = await work();
    await markDone(job.id);
    return result;
  } catch (error) {
    await markRetry(job.id, error instanceof Error ? error.message : "Job failed");
    throw error;
  }
}

export async function enqueueBillingJobs() {
  return Promise.all([
    enqueueOpen("billing.reconcile"),
    enqueueOpen("billing.expireStale"),
    enqueueOpen("billing.expireLapsed"),
    enqueueOpen("billing.reminders")
  ]);
}

/** Hourly rollup for today, plus a one-time 90-day backfill. A finished key is not run again. */
export async function enqueueInsightJobs(now = new Date()) {
  const day = istDayKey(now);
  const hour = istParts(now).hour;
  const rollup = await enqueueJob({
    type: "analytics.rollup",
    payload: { day },
    idempotencyKey: `analytics.rollup:${day}:${hour}`
  });
  const backfill = await enqueueJob({
    type: "analytics.backfill",
    payload: { days: 90 },
    idempotencyKey: "analytics.backfill:90"
  });
  const growth = await enqueueJob({
    type: "growth.score",
    payload: { day },
    idempotencyKey: `growth.score:${day}`
  });
  const settings = await getInsightSettings().catch(() => ({
    reportHourIst: 9,
    reportMinuteIst: 0,
    reportMaxPerMinute: 20,
    whatsappNumber: ""
  }));
  const weekKey = weeklyDue(now, settings.reportHourIst, settings.reportMinuteIst);
  const monthKey = monthlyDue(now, settings.reportHourIst, settings.reportMinuteIst);
  const weekly = weekKey
    ? await enqueueJob({
        type: "reports.weekly",
        payload: { weekKey },
        idempotencyKey: `reports.weekly:${weekKey}`
      })
    : null;
  const monthly = monthKey
    ? await enqueueJob({
        type: "reports.monthly",
        payload: { monthKey },
        idempotencyKey: `reports.monthly:${monthKey}`
      })
    : null;
  return { rollup, backfill, growth, weekly, monthly };
}
