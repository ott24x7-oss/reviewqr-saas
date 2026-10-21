import type { Prisma } from "@prisma/client";
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
