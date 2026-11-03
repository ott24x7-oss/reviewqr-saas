import { prisma } from "../db";
import { enqueueOpen, releaseStaleLocks } from "./store";
import { runClaimedJob } from "./dispatch";

const BILLING_RECONCILE_INTERVAL_MS = 60_000;
const SCHEDULER_KEY = "__qr24x7BillingReconcileScheduler";

type SchedulerGlobal = typeof globalThis & {
  [SCHEDULER_KEY]?: ReturnType<typeof setInterval>;
  __qr24x7BillingReconcileRunning?: boolean;
};

async function reconcileIfOwnUpiIsPending() {
  const state = globalThis as SchedulerGlobal;
  if (state.__qr24x7BillingReconcileRunning) return;
  state.__qr24x7BillingReconcileRunning = true;
  try {
    const now = new Date();
    const [pendingUpi, pendingShopOrder] = await Promise.all([
      prisma.payment.findFirst({
        where: { status: "PENDING", method: "upi" },
        select: { id: true }
      }),
      prisma.shopOrder.findFirst({
        where: { status: "PENDING_PAYMENT", paymentStatus: "PENDING", expiresAt: { gt: now } },
        select: { id: true }
      })
    ]);
    if (!pendingUpi && !pendingShopOrder) return;

    await releaseStaleLocks();
    const job = await enqueueOpen("billing.reconcile");
    await runClaimedJob(job.id);
  } catch (error) {
    console.error("[billing] scheduled reconcile:", error instanceof Error ? error.message : error);
  } finally {
    state.__qr24x7BillingReconcileRunning = false;
  }
}

/** Reconcile pending own-UPI payments on the app process at least once per minute. */
export function scheduleBillingReconciliation() {
  if (process.env.NODE_ENV !== "production") return;
  const state = globalThis as SchedulerGlobal;
  if (state[SCHEDULER_KEY]) return;

  const timer = setInterval(() => void reconcileIfOwnUpiIsPending(), BILLING_RECONCILE_INTERVAL_MS);
  timer.unref?.();
  state[SCHEDULER_KEY] = timer;
  void reconcileIfOwnUpiIsPending();
}
