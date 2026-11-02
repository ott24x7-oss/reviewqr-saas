export const SHOP_ORDER_STEPS = ["paid", "proof", "approved", "printing", "packed", "shipped", "delivered"] as const;
export type ShopOrderStep = (typeof SHOP_ORDER_STEPS)[number];

const STEP_BY_STATUS: Record<string, number> = {
  PAID: 0,
  PROOF_SENT: 1,
  CHANGES_REQUESTED: 1,
  APPROVED: 2,
  PRINTING: 3,
  NFC_WRITTEN: 3,
  PACKED: 4,
  PICKUP_SCHEDULED: 4,
  SHIPPED: 5,
  DELIVERED: 6
};

export type ShopStepperState =
  | { kind: "steps"; currentIndex: number; warning: "changes" | null }
  | { kind: "terminal"; status: "CANCELLED" | "RTO" | "REPRINT" }
  | { kind: "pending" };

/** Pure mapping from the API status to the seven owner-facing progress steps. */
export function shopStepperState(status: string): ShopStepperState {
  if (status === "CANCELLED" || status === "RTO" || status === "REPRINT") return { kind: "terminal", status };
  const currentIndex = STEP_BY_STATUS[status];
  if (currentIndex === undefined) return { kind: "pending" };
  return { kind: "steps", currentIndex, warning: status === "CHANGES_REQUESTED" ? "changes" : null };
}
