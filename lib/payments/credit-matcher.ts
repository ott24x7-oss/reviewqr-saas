/** Pure one-credit/one-payment matching rules. */

export type MatchableCredit = {
  amountPaise: number;
  utr?: string | null;
  receivedAt: Date | string;
};

export type MatchablePayment = {
  id: string;
  paymentType?: "payment" | "shopOrder";
  amount: number;
  status?: string;
  method?: string | null;
  reference?: string | null;
  createdAt: Date | string;
  expiresAt: Date | string | null;
};

export type CreditMatch =
  | { paymentId: string; paymentType?: "shopOrder"; reviewNote: null }
  | { paymentId: null; reviewNote: string | null };

/** Fast preflight for the two one-to-one ledger constraints; DB UNIQUE locks remain authoritative. */
export function canClaimCreditPair(input: {
  creditId: string;
  creditPaymentId: string | null;
  paymentId: string;
  paymentCreditId: string | null;
}): boolean {
  return (!input.creditPaymentId || input.creditPaymentId === input.paymentId)
    && (!input.paymentCreditId || input.paymentCreditId === input.creditId);
}

const THREE_MINUTES = 3 * 60_000;
const ONE_DAY = 24 * 60 * 60_000;

function timestamp(value: Date | string | null): number | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUtr(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function inWindow(creditTime: number, payment: MatchablePayment): boolean {
  const createdAt = timestamp(payment.createdAt);
  const expiresAt = timestamp(payment.expiresAt);
  return createdAt != null && expiresAt != null
    && creditTime > createdAt - THREE_MINUTES
    && creditTime < expiresAt + ONE_DAY;
}

/** Match a parsed, unclaimed bank credit to pending manual UPI payments. */
export function matchCredit(credit: MatchableCredit, pendingPayments: MatchablePayment[]): CreditMatch {
  const receivedAt = timestamp(credit.receivedAt);
  if (receivedAt == null || !Number.isSafeInteger(credit.amountPaise) || credit.amountPaise <= 0) {
    return { paymentId: null, reviewNote: "Credit has an invalid amount or received time." };
  }
  const pending = pendingPayments.filter((payment) =>
    (payment.status == null || payment.status === "PENDING")
    && (payment.method == null || payment.method === "upi")
    && inWindow(receivedAt, payment)
  );
  const creditUtr = normalizeUtr(credit.utr);

  if (creditUtr) {
    const referenceMatches = pending.filter((payment) => normalizeUtr(payment.reference) === creditUtr);
    if (referenceMatches.length > 1) {
      return { paymentId: null, reviewNote: "The entered UTR matches more than one pending payment." };
    }
    if (referenceMatches.length === 1) {
      const payment = referenceMatches[0];
      if (payment.amount !== credit.amountPaise) {
        return { paymentId: null, reviewNote: "UTR was entered on a payment with a different amount." };
      }
      return { paymentId: payment.id, ...(payment.paymentType === "shopOrder" ? { paymentType: "shopOrder" as const } : {}), reviewNote: null };
    }
    // A UTR submitted on any pending payment may never be redirected to another order.
    if (pending.some((payment) => normalizeUtr(payment.reference) === creditUtr)) {
      return { paymentId: null, reviewNote: "UTR belongs to a pending payment with a different amount." };
    }
  }

  const amountMatches = pending.filter((payment) => payment.amount === credit.amountPaise);
  if (amountMatches.length > 1) {
    return { paymentId: null, reviewNote: "Ambiguous: multiple pending payments have this exact amount." };
  }
  if (amountMatches.length === 1) {
    const payment = amountMatches[0];
    // Once a customer supplies a UTR, that payment can only use the matching credit.
    if (normalizeUtr(payment.reference)) {
      return { paymentId: null, reviewNote: null };
    }
    return { paymentId: payment.id, ...(payment.paymentType === "shopOrder" ? { paymentType: "shopOrder" as const } : {}), reviewNote: null };
  }
  return { paymentId: null, reviewNote: null };
}
