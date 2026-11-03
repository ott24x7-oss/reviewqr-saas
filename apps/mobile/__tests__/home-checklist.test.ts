import { homeChecklist, homePromoIndex } from "../src/home/checklist";

describe("home setup checklist", () => {
  it("requires a logo, three items, a stand order and a review", () => {
    expect(homeChecklist({ hasLogo: false, itemCount: 2, hasStandOrder: false, hasReview: false }).map((step) => step.done)).toEqual([false, false, false, false]);
    expect(homeChecklist({ hasLogo: true, itemCount: 3, hasStandOrder: true, hasReview: true }).map((step) => step.done)).toEqual([true, true, true, true]);
  });

  it("rotates the promo by calendar day", () => {
    expect(homePromoIndex(new Date("2026-01-01T00:00:00.000Z"))).toBe(0);
    expect(homePromoIndex(new Date("2026-01-02T00:00:00.000Z"))).toBe(1);
    expect(homePromoIndex(new Date("2026-01-04T00:00:00.000Z"))).toBe(0);
  });
});
