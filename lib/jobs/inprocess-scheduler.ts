import { handleJob } from "./handlers";
import { decideInProcessJobsTick } from "./inprocess-scheduler-policy";
import {
  claimNext,
  externalWorkerIsFresh,
  markDone,
  markRetry,
  releaseStaleLocks,
  touchHeartbeat,
  webWorkerId
} from "./store";
import { enqueueBillingJobs, enqueueInsightJobs } from "./dispatch";

const TICK_INTERVAL_MS = 30_000;
const MAX_JOBS_PER_TICK = 5;
const SCHEDULER_KEY = "__qr24x7InProcessJobsScheduler";
const RUNNING_KEY = "__qr24x7InProcessJobsRunning";
const LAST_ENQUEUE_KEY = "__qr24x7InProcessJobsLastEnqueueAt";

type SchedulerGlobal = typeof globalThis & {
  [SCHEDULER_KEY]?: ReturnType<typeof setInterval>;
  [RUNNING_KEY]?: boolean;
  [LAST_ENQUEUE_KEY]?: number | null;
};

async function runTick() {
  const state = globalThis as SchedulerGlobal;
  const now = new Date();
  const startDecision = decideInProcessJobsTick({
    now: now.getTime(),
    lastEnqueueAt: state[LAST_ENQUEUE_KEY] ?? null,
    tickRunning: Boolean(state[RUNNING_KEY]),
    externalWorkerFresh: false
  });
  if (!startDecision.start) return;

  // Set synchronously before the first await so timer ticks cannot overlap.
  state[RUNNING_KEY] = true;
  const workerId = webWorkerId();
  try {
    await touchHeartbeat(workerId);
    const externalFresh = await externalWorkerIsFresh(now);
    const decision = decideInProcessJobsTick({
      now: now.getTime(),
      lastEnqueueAt: state[LAST_ENQUEUE_KEY] ?? null,
      tickRunning: false,
      externalWorkerFresh: externalFresh
    });

    if (decision.enqueue) {
      // Keep both enqueue paths on the same clock snapshot for report scheduling.
      await enqueueBillingJobs();
      await enqueueInsightJobs(now);
      state[LAST_ENQUEUE_KEY] = now.getTime();
    }

    if (!decision.drain) return;

    await releaseStaleLocks();
    for (let i = 0; i < MAX_JOBS_PER_TICK; i += 1) {
      const job = await claimNext(workerId);
      if (!job) break;
      try {
        await handleJob(job);
        await markDone(job.id);
      } catch (error) {
        await markRetry(job.id, error instanceof Error ? error.message : "Job failed");
      }
    }
  } catch (error) {
    console.error("[jobs] in-process scheduler:", error instanceof Error ? error.message : error);
  } finally {
    state[RUNNING_KEY] = false;
  }
}

/** Start due-job enqueueing and queue draining in the production web process. */
export function scheduleInProcessJobs() {
  if (process.env.NODE_ENV !== "production" || process.env.INPROCESS_JOBS === "0") return;
  const state = globalThis as SchedulerGlobal;
  if (state[SCHEDULER_KEY]) return;

  const timer = setInterval(() => void runTick(), TICK_INTERVAL_MS);
  timer.unref?.();
  state[SCHEDULER_KEY] = timer;
  void runTick();
}
