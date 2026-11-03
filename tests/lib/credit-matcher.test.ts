import { describe, expect, it } from "vitest";
import { canClaimCreditPair, matchCredit } from "../../lib/payments/credit-matcher";

const createdAt = new Date("2026-11-04T10:00:00Z");
const expiresAt = new Date("2026-11-04T10:15:00Z");
const payment = (id: string, fields: Record<string, unknown> = {}) => ({
  id, amount: 99937, status: "PENDING", method: "upi", reference: null, createdAt, expiresAt, ...fields
});
const credit = (fields: Record<string, unknown> = {}) => ({ amountPaise: 99937, utr: "123456789012", receivedAt: new Date("2026-11-04T10:05:00Z"), ...fields });

describe("bank credit matcher", () => {
  it("matches by exact amount when only one pending payment is in the time window", () => {
    expect(matchCredit(credit(), [payment("one")])).toEqual({ paymentId: "one", reviewNote: null });
  });

  it("leaves two same-amount payments for admin review", () => {
    expect(matchCredit(credit(), [payment("one"), payment("two")])).toMatchObject({ paymentId: null, reviewNote: expect.stringContaining("Ambiguous") });
  });

  it("accepts an entered UTR only with its exact credit and amount", () => {
    expect(matchCredit(credit(), [payment("one", { reference: "123456789012" })])).toMatchObject({ paymentId: "one" });
    expect(matchCredit(credit({ amountPaise: 100000 }), [payment("one", { reference: "123456789012" })])).toMatchObject({ paymentId: null, reviewNote: expect.stringContaining("different amount") });
    expect(matchCredit(credit({ utr: "777777777777" }), [payment("one", { reference: "123456789012" })])).toMatchObject({ paymentId: null });
  });

  it("requires the credit to fall between createdAt minus three minutes and expiry plus one day", () => {
    expect(matchCredit(credit({ receivedAt: new Date(createdAt.getTime() - 3 * 60_000) }), [payment("one")]).paymentId).toBeNull();
    expect(matchCredit(credit({ receivedAt: new Date(expiresAt.getTime() + 24 * 60 * 60_000) }), [payment("one")]).paymentId).toBeNull();
    expect(matchCredit(credit({ receivedAt: new Date(expiresAt.getTime() + 23 * 60 * 60_000) }), [payment("one")]).paymentId).toBe("one");
  });

  it("never matches without a pending payment", () => {
    expect(matchCredit(credit(), [])).toEqual({ paymentId: null, reviewNote: null });
  });
});

describe("one-to-one credit claim preflight", () => {
  it("allows an unused pair and an idempotent claim of that same pair", () => {
    expect(canClaimCreditPair({ creditId: "c1", creditPaymentId: null, paymentId: "p1", paymentCreditId: null })).toBe(true);
    expect(canClaimCreditPair({ creditId: "c1", creditPaymentId: "p1", paymentId: "p1", paymentCreditId: "c1" })).toBe(true);
  });

  it("prevents reusing one credit or assigning two credits to one payment", () => {
    expect(canClaimCreditPair({ creditId: "c1", creditPaymentId: "p2", paymentId: "p1", paymentCreditId: null })).toBe(false);
    expect(canClaimCreditPair({ creditId: "c1", creditPaymentId: null, paymentId: "p1", paymentCreditId: "c2" })).toBe(false);
  });
});
