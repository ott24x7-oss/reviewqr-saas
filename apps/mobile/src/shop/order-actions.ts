const CANCELLABLE_BEFORE_PRODUCTION = new Set([
  "PENDING_PAYMENT", "PAID", "PROOF_SENT", "CHANGES_REQUESTED", "APPROVED"
]);
const ADDRESS_EDITABLE_BEFORE_DISPATCH = new Set([
  "PENDING_PAYMENT", "PAID", "PROOF_SENT", "CHANGES_REQUESTED", "APPROVED", "PRINTING", "NFC_WRITTEN", "PACKED"
]);

export type ShopOwnerOrderActions = {
  payNow: boolean;
  cancel: boolean;
  cancellationRequestPending: boolean;
  changeAddress: boolean;
  buyAgain: boolean;
  contactSupport: boolean;
};

export type ShopOrderFilter = "ALL" | "ACTIVE" | "DELIVERED" | "CANCELLED";

export function filterShopOrders<T extends { status: string; createdAt: string }>(items: T[], filter: ShopOrderFilter) {
  return items
    .filter((item) => filter === "ALL"
      || (filter === "ACTIVE" && !["DELIVERED", "CANCELLED"].includes(item.status))
      || (filter === "DELIVERED" && item.status === "DELIVERED")
      || (filter === "CANCELLED" && item.status === "CANCELLED"))
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function orderActions(status: string, flags: {
  paymentStatus?: string;
  cancellationRequestPending?: boolean;
  shipmentBooked?: boolean;
} = {}): ShopOwnerOrderActions {
  const pendingPayment = status === "PENDING_PAYMENT" && (flags.paymentStatus ?? "PENDING") === "PENDING";
  const paidBeforeProduction = ["PAID", "PROOF_SENT", "CHANGES_REQUESTED", "APPROVED"].includes(status)
    && (flags.paymentStatus === "PAID" || flags.paymentStatus === "REFUNDED");
  return {
    payNow: pendingPayment,
    cancel: (pendingPayment || paidBeforeProduction) && CANCELLABLE_BEFORE_PRODUCTION.has(status) && !flags.cancellationRequestPending,
    cancellationRequestPending: !!flags.cancellationRequestPending,
    changeAddress: ADDRESS_EDITABLE_BEFORE_DISPATCH.has(status) && !flags.shipmentBooked,
    buyAgain: true,
    contactSupport: true
  };
}
