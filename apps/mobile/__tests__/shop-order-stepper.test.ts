import { shopStepperState } from "../src/shop/status-stepper";

describe("shop order progress", () => {
  it("maps order statuses to the delivery steps", () => {
    expect(shopStepperState("PAID")).toEqual({ kind: "steps", currentIndex: 0, warning: null });
    expect(shopStepperState("PROOF_SENT")).toEqual({ kind: "steps", currentIndex: 1, warning: null });
    expect(shopStepperState("CHANGES_REQUESTED")).toEqual({ kind: "steps", currentIndex: 1, warning: "changes" });
    expect(shopStepperState("APPROVED")).toMatchObject({ kind: "steps", currentIndex: 2 });
    expect(shopStepperState("PRINTING")).toMatchObject({ kind: "steps", currentIndex: 3 });
    expect(shopStepperState("NFC_WRITTEN")).toMatchObject({ kind: "steps", currentIndex: 3 });
    expect(shopStepperState("PACKED")).toMatchObject({ kind: "steps", currentIndex: 4 });
    expect(shopStepperState("PICKUP_SCHEDULED")).toMatchObject({ kind: "steps", currentIndex: 4 });
    expect(shopStepperState("SHIPPED")).toMatchObject({ kind: "steps", currentIndex: 5 });
    expect(shopStepperState("DELIVERED")).toMatchObject({ kind: "steps", currentIndex: 6 });
  });

  it.each(["CANCELLED", "RTO", "REPRINT"] as const)("uses a terminal banner for %s", (status) => {
    expect(shopStepperState(status)).toEqual({ kind: "terminal", status });
  });
});
