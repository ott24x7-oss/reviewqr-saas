import { claimNext, markDone, markRetry, releaseStaleLocks, touchHeartbeat } from "./store";
import { handleJob } from "./handlers";

export async function runWorkerLoop(workerId: string, sleep: (ms: number) => Promise<void> = delay) {
  for (;;) {
    await touchHeartbeat(workerId);
    await releaseStaleLocks();
    const job = await claimNext(workerId);
    if (!job) {
      await sleep(1000);
      continue;
    }
    try {
      await handleJob(job);
      await markDone(job.id);
    } catch (error) {
      await markRetry(job.id, error instanceof Error ? error.message : "Job failed");
    }
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
