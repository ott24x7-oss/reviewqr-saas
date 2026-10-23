/** A YouPI checkout that never receives a payment link is abandoned after this long. */
export const CHECKOUT_ABANDON_MS = 45 * 60 * 1000;

/**
 * A scheduled downgrade invoice stays payable for about 30 days and has no
 * checkout link until the owner presses Pay now. That window is far longer
 * than a checkout, so age alone must not treat it as abandoned.
 */
export const SCHEDULED_INVOICE_MIN_MS = 2 * 60 * 60 * 1000;

export const CLOSED_INVOICE_STATUSES = ["EXPIRED", "CANCELLED"] as const;

export type InvoiceRefuseReason = "expired" | "cancelled" | "abandoned";

export type OpenInvoice = {
  status: string;
  expiresAt: Date | null;
  checkoutUrl: string | null;
  planId: string | null;
  createdAt: Date;
};

export type PendingPlanRef = {
  status: string;
  pendingPlanId: string | null;
} | null;

export function isScheduledInvoice(payment: Pick<OpenInvoice, "expiresAt" | "createdAt">) {
  if (!payment.expiresAt) return false;
  return payment.expiresAt.getTime() - payment.createdAt.getTime() > SCHEDULED_INVOICE_MIN_MS;
}

/** The subscription that still owns this invoice's plan, if any. */
export function pendingForInvoice(
  subs: Array<{ status: string; pendingPlanId: string | null }>,
  planId: string | null
): PendingPlanRef {
  if (!planId) return null;
  const live = subs.find((row) => row.pendingPlanId === planId && row.status !== "CANCELED");
  if (live) return live;
  return subs.find((row) => row.pendingPlanId === planId) ?? null;
}

/**
 * Payable YouPI invoices are PENDING or QUEUED.
 * Expired means `expiresAt` has passed.
 * Cancelled means a scheduled invoice whose pending plan was cleared or the subscription was cancelled.
 * Abandoned means a short checkout that never received a payment link.
 */
export function refuseInvoice(payment: OpenInvoice, pending: PendingPlanRef, now: Date): InvoiceRefuseReason | null {
  if (payment.status !== "PENDING" && payment.status !== "QUEUED") return null;
  if (payment.expiresAt && payment.expiresAt.getTime() <= now.getTime()) return "expired";
  if (isScheduledInvoice(payment) && payment.planId) {
    if (!pending || pending.status === "CANCELED" || pending.pendingPlanId !== payment.planId) return "cancelled";
  }
  if (
    !isScheduledInvoice(payment) &&
    !payment.checkoutUrl &&
    now.getTime() - payment.createdAt.getTime() >= CHECKOUT_ABANDON_MS
  ) {
    return "abandoned";
  }
  return null;
}

export function statusForRefuse(reason: InvoiceRefuseReason): "EXPIRED" | "CANCELLED" {
  return reason === "cancelled" ? "CANCELLED" : "EXPIRED";
}

export function billingPaymentWhere(userId: string) {
  return {
    userId,
    status: { notIn: [...CLOSED_INVOICE_STATUSES] }
  };
}
