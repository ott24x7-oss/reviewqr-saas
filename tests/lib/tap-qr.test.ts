import { describe, expect, it } from "vitest";
import { claimDecision, codeFromScan, plainLabel, storedStatus } from "../../lib/tap/qr-stock";

const target = { businessId: "b1", businessName: "Sola Cafe", ownerId: "owner-1" };

describe("QR claim rules", () => {
  it("asks before activating unassigned stock", () => {
    expect(claimDecision({ status: "UNASSIGNED", businessId: null, ownerId: null }, target)).toEqual({
      action: "activate",
      message: "Activate for Sola Cafe?"
    });
  });

  it("blocks a code that already belongs to someone", () => {
    expect(
      claimDecision({ status: "ACTIVE", businessId: "b2", ownerId: "owner-2" }, target)
    ).toEqual({ action: "blocked", message: "Contact support to reassign" });
  });

  it("blocks a move to another business of the same owner", () => {
    expect(claimDecision({ status: "ACTIVE", businessId: "b9", ownerId: "owner-1" }, target).action).toBe("blocked");
  });

  it("recognises a code that is already on this business", () => {
    expect(claimDecision({ status: "ACTIVE", businessId: "b1", ownerId: "owner-1" }, target).action).toBe("already");
  });

  it("tells the owner when the code is disabled", () => {
    expect(claimDecision({ status: "DISABLED", businessId: null, ownerId: null }, target).message).toBe(
      "This QR is disabled"
    );
  });

  it("keeps unassigned stock publicly active so the page is not the disabled screen", () => {
    expect(storedStatus("UNASSIGNED").isActive).toBe(true);
    expect(storedStatus("DISABLED").isActive).toBe(false);
  });
});

describe("scanned QR text", () => {
  it("reads a code from a QR url and from plain text", () => {
    expect(codeFromScan("https://reviewqr.example/q/DEMO-CNTR?src=qr")).toBe("DEMO-CNTR");
    expect(codeFromScan("https://reviewqr.example/t/ABCD/?src=nfc")).toBe("ABCD");
    expect(codeFromScan("ABCDEFGHJKLM")).toBe("ABCDEFGHJKLM");
    expect(codeFromScan("no")).toBeNull();
    expect(codeFromScan("javascript:alert(1)")).toBeNull();
  });

  it("strips tags from a label", () => {
    expect(plainLabel("  Table <b>4</b>  ")).toBe("Table 4");
  });
});
