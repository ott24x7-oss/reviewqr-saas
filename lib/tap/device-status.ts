import type { QrStatusName } from "./qr-stock";

export type DeviceStatusName = "IN_STOCK" | "ASSIGNED" | "ACTIVE" | "DISABLED" | "LOST";

export type DeviceAuditAction =
  | "device.assign"
  | "device.activate"
  | "device.reassign"
  | "device.disable"
  | "device.lost";

const MOVES: Record<DeviceStatusName, DeviceStatusName[]> = {
  IN_STOCK: ["ASSIGNED", "ACTIVE", "DISABLED"],
  ASSIGNED: ["IN_STOCK", "ACTIVE", "DISABLED"],
  ACTIVE: ["DISABLED", "LOST", "IN_STOCK"],
  DISABLED: ["ACTIVE", "IN_STOCK"],
  LOST: ["ACTIVE", "IN_STOCK"]
};

export function canMoveDevice(from: DeviceStatusName, to: DeviceStatusName) {
  return from === to || MOVES[from].includes(to);
}

function move(from: DeviceStatusName, to: DeviceStatusName) {
  if (from === to) return to;
  return MOVES[from].includes(to) ? to : null;
}

/** QR row that matches a device. Assigned stock stays unpublished. */
export function qrStatusForDevice(status: DeviceStatusName): QrStatusName {
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "DISABLED" || status === "LOST") return "DISABLED";
  return "UNASSIGNED";
}

/**
 * Device status after a QR row changes.
 * Lost stays lost when the QR is disabled again. Stock with no business returns to IN_STOCK.
 */
export function deviceFollowsQr(current: DeviceStatusName, qrStatus: QrStatusName, businessId: string | null) {
  if (qrStatus === "ACTIVE") return move(current, "ACTIVE");
  if (qrStatus === "DISABLED") {
    if (current === "LOST") return "LOST";
    return move(current, "DISABLED");
  }
  if (businessId && current === "ASSIGNED") return "ASSIGNED";
  return move(current, "IN_STOCK");
}

/** Only a live tag can be reported lost. */
export function lostStatus(current: DeviceStatusName) {
  return move(current, "LOST");
}

export function deviceAuditAction(
  from: DeviceStatusName,
  to: DeviceStatusName,
  businessChanged: boolean
): DeviceAuditAction {
  if (to === "LOST") return "device.lost";
  if (to === "DISABLED") return "device.disable";
  if (to === "ACTIVE" && from === "ACTIVE" && businessChanged) return "device.reassign";
  if (to === "ACTIVE") return "device.activate";
  return "device.assign";
}
