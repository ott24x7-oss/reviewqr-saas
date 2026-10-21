/** Shop order moves. A failed delivery attempt stays on Shipped. */

export const SHOP_ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PROOF_SENT",
  "CHANGES_REQUESTED",
  "APPROVED",
  "PRINTING",
  "NFC_WRITTEN",
  "PACKED",
  "PICKUP_SCHEDULED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RTO",
  "REPRINT"
] as const;

export type ShopOrderStatusName = (typeof SHOP_ORDER_STATUSES)[number];

export type ShopMoveActor = "admin" | "owner" | "agent";

export type ShopMoveContext = {
  actor: ShopMoveActor;
  anyLineNeedsNfc: boolean;
  reprintApproved: boolean;
  comment?: string | null;
};

const NEXT: Record<ShopOrderStatusName, ShopOrderStatusName[]> = {
  PENDING_PAYMENT: [],
  PAID: ["PROOF_SENT", "CANCELLED"],
  PROOF_SENT: ["APPROVED", "CHANGES_REQUESTED", "CANCELLED"],
  CHANGES_REQUESTED: ["PROOF_SENT", "CANCELLED"],
  APPROVED: ["PRINTING", "CANCELLED"],
  PRINTING: ["NFC_WRITTEN", "PACKED", "REPRINT"],
  NFC_WRITTEN: ["PACKED", "REPRINT"],
  PACKED: ["PICKUP_SCHEDULED", "CANCELLED"],
  PICKUP_SCHEDULED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RTO"],
  DELIVERED: ["REPRINT"],
  CANCELLED: [],
  RTO: ["REPRINT", "CANCELLED"],
  REPRINT: ["PRINTING"]
};

export function isShopOrderStatus(value: string): value is ShopOrderStatusName {
  return (SHOP_ORDER_STATUSES as readonly string[]).includes(value);
}

export function shopStatusLabel(status: ShopOrderStatusName) {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Awaiting payment";
    case "PAID":
      return "Paid";
    case "PROOF_SENT":
      return "Design proof sent";
    case "CHANGES_REQUESTED":
      return "Changes requested";
    case "APPROVED":
      return "Customer approved";
    case "PRINTING":
      return "Printing";
    case "NFC_WRITTEN":
      return "NFC written";
    case "PACKED":
      return "Packed";
    case "PICKUP_SCHEDULED":
      return "Pickup scheduled";
    case "SHIPPED":
      return "Shipped";
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
      return "Cancelled";
    case "RTO":
      return "RTO";
    case "REPRINT":
      return "Reprint";
    default:
      return status;
  }
}

/** Admins may take any allowed step. Owners and agents may only answer a proof. */
export function moveAllowed(from: ShopOrderStatusName, to: ShopOrderStatusName, ctx: ShopMoveContext) {
  if (from === to) return false;
  if (!NEXT[from].includes(to)) return false;
  if (from === "PRINTING" && to === "PACKED" && ctx.anyLineNeedsNfc) return false;
  if (from === "PRINTING" && to === "NFC_WRITTEN" && !ctx.anyLineNeedsNfc) return false;
  if (from === "DELIVERED" && to === "REPRINT" && !ctx.reprintApproved) return false;
  if (to === "CHANGES_REQUESTED" && !ctx.comment?.trim()) return false;
  if (ctx.actor === "admin") return true;
  return from === "PROOF_SENT" && (to === "APPROVED" || to === "CHANGES_REQUESTED");
}

export function moveError(from: ShopOrderStatusName, to: ShopOrderStatusName, ctx: ShopMoveContext) {
  if (moveAllowed(from, to, ctx)) return null;
  if (to === "CHANGES_REQUESTED" && !ctx.comment?.trim()) return "Add a comment about the changes";
  if (from === "DELIVERED" && to === "REPRINT") return "A reprint after delivery needs an approved damage or misprint request";
  if (from === "PRINTING" && to === "PACKED" && ctx.anyLineNeedsNfc) return "Write and verify the NFC tag before packing";
  return "That status change is not allowed";
}

/** A failed delivery attempt is a note on Shipped. It does not add a status. */
export function ndrKeepsStatus(status: ShopOrderStatusName): { ok: true; status: "SHIPPED" } | { ok: false; error: string } {
  if (status !== "SHIPPED") {
    return { ok: false, error: "A failed delivery attempt is recorded only while the order is shipped" };
  }
  return { ok: true, status: "SHIPPED" };
}
