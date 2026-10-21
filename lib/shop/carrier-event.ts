/**
 * Pure carrier-event decisions. A failed delivery stays on Shipped.
 * Import this from tests; it does not touch the database.
 */
import { moveAllowed, ndrKeepsStatus, type ShopOrderStatusName } from "./order-status";

export type CarrierAction = "ndr" | "delivered" | "rto" | "shipped" | "ignore";

export function carrierEventKey(eventId: string, awb: string, status: string) {
  return [eventId.trim(), awb.trim(), status.trim().toLowerCase()].join("|");
}

export function carrierEventAction(status: string): CarrierAction {
  const value = status.trim().toLowerCase();
  if (!value) return "ignore";
  if (value.includes("ndr") || value.includes("undeliver") || value.includes("non delivery") || value.includes("failed")) {
    return "ndr";
  }
  if (value.includes("rto") || value.includes("return to origin")) return "rto";
  if (value.includes("delivered")) return "delivered";
  if (value.includes("out for delivery") || value.includes("in transit") || value.includes("picked") || value.includes("shipped")) {
    return "shipped";
  }
  return "ignore";
}

/** Admin-sized moves only. NDR never changes the status. */
export function carrierMove(from: ShopOrderStatusName, action: CarrierAction): { ndr: boolean; to: ShopOrderStatusName | null } {
  if (action === "ignore") return { ndr: false, to: null };
  if (action === "ndr") return { ndr: ndrKeepsStatus(from).ok, to: null };
  const to: ShopOrderStatusName = action === "delivered" ? "DELIVERED" : action === "rto" ? "RTO" : "SHIPPED";
  if (from === to) return { ndr: false, to: null };
  const allowed = moveAllowed(from, to, { actor: "admin", anyLineNeedsNfc: false, reprintApproved: false });
  return { ndr: false, to: allowed ? to : null };
}
