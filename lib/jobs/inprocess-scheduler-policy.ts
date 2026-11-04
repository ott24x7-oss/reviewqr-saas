export const INPROCESS_ENQUEUE_INTERVAL_MS = 5 * 60_000;

export type InProcessJobsTickInput = {
  now: number;
  lastEnqueueAt: number | null;
  tickRunning: boolean;
  externalWorkerFresh: boolean;
};

export type InProcessJobsTickDecision = {
  start: boolean;
  enqueue: boolean;
  drain: boolean;
};

/** Pure policy for deciding which parts of a web scheduler tick may run. */
export function decideInProcessJobsTick(input: InProcessJobsTickInput): InProcessJobsTickDecision {
  if (input.tickRunning) return { start: false, enqueue: false, drain: false };

  return {
    start: true,
    enqueue:
      input.lastEnqueueAt === null || input.now - input.lastEnqueueAt >= INPROCESS_ENQUEUE_INTERVAL_MS,
    drain: !input.externalWorkerFresh
  };
}
