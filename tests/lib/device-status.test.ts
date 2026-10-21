import { describe, expect, it } from "vitest";
import { storedStatus } from "../../lib/tap/qr-stock";
import {
  canMoveDevice,
  deviceAuditAction,
  deviceFollowsQr,
  lostStatus,
  qrStatusForDevice,
  type DeviceStatusName
} from "../../lib/tap/device-status";

const STATUSES: DeviceStatusName[] = ["IN_STOCK", "ASSIGNED", "ACTIVE", "DISABLED", "LOST"];

describe("device status", () => {
  it("allows the stock, live, disabled, and lost moves", () => {
    expect(canMoveDevice("IN_STOCK", "ASSIGNED")).toBe(true);
    expect(canMoveDevice("IN_STOCK", "ACTIVE")).toBe(true);
    expect(canMoveDevice("ASSIGNED", "ACTIVE")).toBe(true);
    expect(canMoveDevice("ASSIGNED", "IN_STOCK")).toBe(true);
    expect(canMoveDevice("ACTIVE", "DISABLED")).toBe(true);
    expect(canMoveDevice("ACTIVE", "LOST")).toBe(true);
    expect(canMoveDevice("LOST", "ACTIVE")).toBe(true);
    expect(canMoveDevice("DISABLED", "ACTIVE")).toBe(true);
    expect(canMoveDevice("ACTIVE", "IN_STOCK")).toBe(true);
    expect(canMoveDevice("IN_STOCK", "DISABLED")).toBe(true);
    expect(canMoveDevice("DISABLED", "IN_STOCK")).toBe(true);
  });

  it("rejects inverted and skipped moves", () => {
    expect(canMoveDevice("ACTIVE", "ASSIGNED")).toBe(false);
    expect(canMoveDevice("IN_STOCK", "LOST")).toBe(false);
    expect(canMoveDevice("LOST", "DISABLED")).toBe(false);
    expect(canMoveDevice("DISABLED", "LOST")).toBe(false);
    expect(canMoveDevice("ASSIGNED", "LOST")).toBe(false);
    expect(lostStatus("IN_STOCK")).toBeNull();
    expect(lostStatus("DISABLED")).toBeNull();
    expect(lostStatus("ACTIVE")).toBe("LOST");
    expect(lostStatus("LOST")).toBe("LOST");
  });

  it("keeps assigned stock unpublished and lost tags disabled", () => {
    for (const status of STATUSES) {
      const qr = qrStatusForDevice(status);
      const stored = storedStatus(qr);
      if (status === "ACTIVE") expect(stored).toEqual({ status: "ACTIVE", isActive: true });
      else if (status === "DISABLED" || status === "LOST") expect(stored).toEqual({ status: "DISABLED", isActive: false });
      else expect(stored).toEqual({ status: "UNASSIGNED", isActive: true });
    }
  });

  it("follows a QR change without dropping a lost tag", () => {
    expect(deviceFollowsQr("IN_STOCK", "ACTIVE", "biz")).toBe("ACTIVE");
    expect(deviceFollowsQr("ASSIGNED", "ACTIVE", "biz")).toBe("ACTIVE");
    expect(deviceFollowsQr("ACTIVE", "DISABLED", "biz")).toBe("DISABLED");
    expect(deviceFollowsQr("LOST", "DISABLED", "biz")).toBe("LOST");
    expect(deviceFollowsQr("DISABLED", "ACTIVE", "biz")).toBe("ACTIVE");
    expect(deviceFollowsQr("LOST", "ACTIVE", "biz")).toBe("ACTIVE");
    expect(deviceFollowsQr("ACTIVE", "UNASSIGNED", null)).toBe("IN_STOCK");
    expect(deviceFollowsQr("ASSIGNED", "UNASSIGNED", null)).toBe("IN_STOCK");
    expect(deviceFollowsQr("ASSIGNED", "UNASSIGNED", "biz")).toBe("ASSIGNED");
    expect(deviceFollowsQr("IN_STOCK", "UNASSIGNED", null)).toBe("IN_STOCK");
    expect(deviceFollowsQr("DISABLED", "UNASSIGNED", null)).toBe("IN_STOCK");
  });

  it("names the audit action for each landing status", () => {
    expect(deviceAuditAction("IN_STOCK", "ACTIVE", true)).toBe("device.activate");
    expect(deviceAuditAction("ACTIVE", "ACTIVE", true)).toBe("device.reassign");
    expect(deviceAuditAction("IN_STOCK", "ASSIGNED", true)).toBe("device.assign");
    expect(deviceAuditAction("ACTIVE", "DISABLED", false)).toBe("device.disable");
    expect(deviceAuditAction("ACTIVE", "LOST", false)).toBe("device.lost");
    expect(deviceAuditAction("LOST", "ACTIVE", false)).toBe("device.activate");
  });
});
