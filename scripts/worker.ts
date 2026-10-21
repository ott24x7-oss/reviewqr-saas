import { warnDevOtpInProduction } from "../lib/auth/dev-otp";
import { runWorkerLoop } from "../lib/jobs/worker";

warnDevOtpInProduction();

const workerId = process.env.WORKER_ID || `worker-${process.pid}`;
runWorkerLoop(workerId).catch((error) => {
  console.error("[worker] stopped", error instanceof Error ? error.message : "failed");
  process.exit(1);
});
