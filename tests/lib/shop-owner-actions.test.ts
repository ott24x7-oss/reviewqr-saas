import { describe, expect, it } from "vitest";
import { canChangeShopAddress, shopCancelDecision, splitBuyAgainLines } from "../../lib/shop/owner-actions";

describe("shop owner order actions", () => {
  it.each(["PENDING_PAYMENT", "PAID", "PROOF_SENT", "CHANGES_REQUESTED", "APPROVED"])("allows cancellation before production for %s", (status) => {
    const decision = shopCancelDecision(status, status === "PENDING_PAYMENT" ? "PENDING" : "PAID", 25000);
    expect(decision.allowed).toBe(true);
  });

  it.each(["PRINTING", "NFC_WRITTEN", "PACKED", "PICKUP_SCHEDULED", "SHIPPED", "DELIVERED", "CANCELLED", "RTO", "REPRINT"])("refuses cancellation after production starts for %s", (status) => {
    expect(shopCancelDecision(status, "PAID", 25000).allowed).toBe(false);
  });

  it("cancels an unpaid pending payment without requesting a refund", () => {
    expect(shopCancelDecision("PENDING_PAYMENT", "PENDING", 25000)).toEqual({ allowed: true, kind: "cancel", refundPaise: 0, refundMethod: null });
  });

  it("requests an admin-reviewed refund on the original method once for a paid order", () => {
    expect(shopCancelDecision("PAID", "PAID", 25000)).toEqual({ allowed: true, kind: "request", refundPaise: 25000, refundMethod: "ORIGINAL_PAYMENT_METHOD" });
  });

  it("allows address edits before carrier booking only", () => {
    expect(canChangeShopAddress("PACKED", false)).toBe(true);
    expect(canChangeShopAddress("PACKED", true)).toBe(false);
    expect(canChangeShopAddress("PICKUP_SCHEDULED", false)).toBe(false);
    expect(canChangeShopAddress("SHIPPED", false)).toBe(false);
  });

  it("skips unavailable variants while preserving available purchase selections", () => {
    const lines = [
      { sku: "A", qty: 2, unbranded: true, design: { qrShortCode: "QR1" }, name: "QR Stand" },
      { sku: "B", qty: 1, unbranded: false, design: null, name: "Old sticker" },
      { sku: "C", qty: 3, unbranded: false, design: null, name: "Out of stock card" }
    ];
    const result = splitBuyAgainLines(lines, [
      { sku: "A", active: true, stock: 5, minQty: 1 },
      { sku: "B", active: false, stock: 10, minQty: 1 },
      { sku: "C", active: true, stock: 2, minQty: 1 }
    ]);
    expect(result.available).toEqual([lines[0]]);
    expect(result.skipped).toEqual(["Old sticker", "Out of stock card"]);
  });
});
