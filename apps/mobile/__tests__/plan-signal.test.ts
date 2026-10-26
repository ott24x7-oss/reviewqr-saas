import { readData } from "../src/api/http";
import { emitPlanRequired, onPlanRequired } from "../src/state/plan-signal";

function denied(feature: string) {
  return {
    ok: false,
    status: 403,
    json: async () => ({
      code: "PLAN_REQUIRED",
      feature,
      error: { message: "locked", code: "PLAN_REQUIRED", feature }
    })
  } as Response;
}

describe("plan lock bus", () => {
  it("notifies listeners until they unsubscribe", () => {
    const seen: string[] = [];
    const stop = onPlanRequired((id) => seen.push(id));
    emitPlanRequired("menu");
    stop();
    emitPlanRequired("store");
    expect(seen).toEqual(["menu"]);
  });

  it("opens the sheet on PLAN_REQUIRED unless the caller quiets it", async () => {
    const seen: string[] = [];
    const stop = onPlanRequired((id) => seen.push(id));
    await expect(readData(denied("orders"))).rejects.toMatchObject({ status: 403, code: "PLAN_REQUIRED", feature: "orders" });
    await expect(readData(denied("orders"), { planSheet: false })).rejects.toMatchObject({ feature: "orders" });
    stop();
    expect(seen).toEqual(["orders"]);
  });
});
