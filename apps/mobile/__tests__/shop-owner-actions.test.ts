import { buyNowFlow } from "../src/shop/buy-now";
import { orderActions } from "../src/shop/order-actions";

describe("Buy now flow", () => {
  const variant = { sku: "STAND", minQty: 2 };

  it("adds simple products directly at their minimum quantity", () => {
    expect(buyNowFlow({ needsDesign: false, needsNfc: false, variants: [variant] })).toEqual({ mode: "direct", sku: "STAND", qty: 2 });
  });

  it.each([
    { needsDesign: true, needsNfc: false, variants: [variant] },
    { needsDesign: false, needsNfc: true, variants: [variant] },
    { needsDesign: false, needsNfc: false, variants: [variant, { sku: "STAND-L", minQty: 1 }] }
  ])("opens the product sheet when a purchase choice is needed", (product) => {
    expect(buyNowFlow(product)?.mode).toBe("sheet");
  });

  it("ignores products without an active variant", () => {
    expect(buyNowFlow({ needsDesign: false, needsNfc: false, variants: [] })).toBeNull();
  });
});

describe("owner order actions", () => {
  it.each([
    ["PENDING_PAYMENT", true, true, true],
    ["PAID", false, true, true],
    ["PROOF_SENT", false, true, true],
    ["CHANGES_REQUESTED", false, true, true],
    ["APPROVED", false, true, true],
    ["PRINTING", false, false, true],
    ["NFC_WRITTEN", false, false, true],
    ["PACKED", false, false, true],
    ["PICKUP_SCHEDULED", false, false, false],
    ["SHIPPED", false, false, false],
    ["DELIVERED", false, false, false],
    ["CANCELLED", false, false, false],
    ["RTO", false, false, false],
    ["REPRINT", false, false, false]
  ] as const)("shows allowed actions for %s", (status, pay, cancel, address) => {
    const actions = orderActions(status, { paymentStatus: status === "PENDING_PAYMENT" ? "PENDING" : "PAID" });
    expect(actions.payNow).toBe(pay);
    expect(actions.cancel).toBe(cancel);
    expect(actions.changeAddress).toBe(address);
    expect(actions.buyAgain).toBe(true);
    expect(actions.contactSupport).toBe(true);
  });

  it("only shows cancellation when the payment state supports it", () => {
    expect(orderActions("PAID", { paymentStatus: "PENDING" }).cancel).toBe(false);
    expect(orderActions("APPROVED", { paymentStatus: "FAILED" }).cancel).toBe(false);
    expect(orderActions("APPROVED", { paymentStatus: "REFUNDED" }).cancel).toBe(true);
  });

  it("hides actions after an admin cancellation request and when an AWB exists", () => {
    expect(orderActions("PAID", { cancellationRequestPending: true }).cancel).toBe(false);
    expect(orderActions("PACKED", { shipmentBooked: true }).changeAddress).toBe(false);
  });
});
