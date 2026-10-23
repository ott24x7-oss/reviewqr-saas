import { describe, expect, it } from "vitest";
import { growthWeights, scoreGrowth, type GrowthInput } from "../../lib/growth/score";

function input(overrides: Partial<GrowthInput> = {}): GrowthInput {
  return {
    businessId: "biz",
    ageDays: 14,
    storeOn: true,
    menuOn: true,
    reviewsLast7: 0,
    reviewsPrev7: 0,
    avgRating: null,
    ratingCount: 0,
    feedbackTotal: 0,
    feedbackReplied: 0,
    hasLogo: false,
    hasHours: false,
    linkCount: 0,
    hasMenu: false,
    orderCount: 0,
    repeatCustomers: 0,
    scansLast7: 0,
    scansPrev7: 0,
    doneTips: [],
    ...overrides
  };
}

describe("growth score", () => {
  it("hides the score until seven days of data", () => {
    const scored = scoreGrowth(input({ ageDays: 6 }));
    expect(scored.ready).toBe(false);
    expect(scored.score).toBeNull();
    expect(scored.tips).toEqual([]);
    expect(scored.checklist.find((item) => item.key === "logo")?.done).toBe(false);
    expect(scored.checklist.find((item) => item.key === "hours")?.titleEn).toBe("Add your opening hours");
  });

  it("picks the three weakest components and skips a marked tip", () => {
    const fresh = scoreGrowth(input());
    expect(fresh.ready).toBe(true);
    expect(fresh.score).toBe(15);
    expect(fresh.tips.map((tip) => tip.key)).toEqual(["reviews", "rating", "orders"]);
    expect(fresh.tips[0]?.href).toContain("/print");
    expect(fresh.tips[2]?.titleEn).toBe("Take your first WhatsApp order");
    const marked = scoreGrowth(input({ doneTips: ["reviews"] }));
    expect(marked.tips.map((tip) => tip.key)).toEqual(["rating", "orders", "scans"]);
    expect(marked.score).toBe(fresh.score);
  });

  it("moves the orders weight onto scans when the store is off", () => {
    expect(growthWeights(true)).toMatchObject({ ordersRepeat: 15, scansTrend: 10, tapPage: 20 });
    expect(growthWeights(false)).toMatchObject({ ordersRepeat: 0, scansTrend: 25 });
    const scored = scoreGrowth(input({ storeOn: false, menuOn: false, hasMenu: false }));
    expect(scored.tips.map((tip) => tip.key)).toEqual(["scans", "reviews", "rating"]);
    expect(scored.components.find((row) => row.key === "menu")?.ratio).toBe(1);
    expect(scored.components.find((row) => row.key === "orders")).toBeUndefined();
  });

  it("does not treat a missing previous period as a perfect pace", () => {
    const none = scoreGrowth(input({ reviewsLast7: 0, reviewsPrev7: 0 }));
    expect(none.components.find((row) => row.key === "reviews")?.ratio).toBe(0);
    const started = scoreGrowth(input({ reviewsLast7: 2, reviewsPrev7: 0, avgRating: 4, ratingCount: 2 }));
    expect(started.components.find((row) => row.key === "reviews")?.ratio).toBe(0.5);
    expect(started.components.find((row) => row.key === "rating")?.ratio).toBe(0.8);
    const quiet = scoreGrowth(input({ feedbackTotal: 4, feedbackReplied: 1 }));
    expect(quiet.components.find((row) => row.key === "feedback")?.ratio).toBe(0.25);
    expect(quiet.components.find((row) => row.key === "feedback")?.titleEn).toBe("Reply to 3 private feedbacks");
  });
});
