export type PaymentPoll = "paid" | "pending" | "stopped";

/**
 * Watches one shop order. A failed check waits and tries again.
 * Abort or unmount returns "stopped". The deadline returns "pending".
 */
export async function pollPayment(input: {
  orderId: string;
  signal: AbortSignal;
  fetchOrder: (orderId: string) => Promise<{ paymentStatus: string }>;
  sleep: (ms: number) => Promise<void>;
  now?: () => number;
  deadlineMs?: number;
}): Promise<PaymentPoll> {
  const now = input.now ?? Date.now;
  const deadlineMs = input.deadlineMs ?? 24_000;
  const started = now();
  let delay = 1000;
  while (!input.signal.aborted) {
    if (now() - started >= deadlineMs) return "pending";
    try {
      const order = await input.fetchOrder(input.orderId);
      if (input.signal.aborted) return "stopped";
      if (order.paymentStatus === "PAID") return "paid";
    } catch {
      if (input.signal.aborted) return "stopped";
    }
    const elapsed = now() - started;
    if (elapsed >= deadlineMs) return "pending";
    const wait = Math.min(delay, deadlineMs - elapsed);
    delay = Math.min(delay * 2, 4000);
    try {
      await input.sleep(wait);
    } catch {
      return "stopped";
    }
  }
  return "stopped";
}
