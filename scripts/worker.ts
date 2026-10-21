import { warnDevOtpInProduction } from "../lib/auth/dev-otp";
import { runWorkerLoop } from "../lib/jobs/worker";
import { warnShopPaymentStubInProduction } from "../lib/shop/payment-stub";

warnDevOtpInProduction();
warnShopPaymentStubInProduction();

const workerId = process.env.WORKER_ID || `worker-${process.pid}`;
runWorkerLoop(workerId).catch((error) => {
  console.error("[worker] stopped", error instanceof Error ? error.message : "failed");
  process.exit(1);
});
