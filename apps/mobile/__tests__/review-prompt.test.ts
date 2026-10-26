import { nextCounts, resetReviewBlockForTests, REVIEW_GAP_MS, shouldAskForReview, blockReviewAfterError, considerReviewPrompt } from "../src/review/prompt";

const day = 24 * 60 * 60 * 1000;

describe("Play review prompt", () => {
  beforeEach(() => {
    resetReviewBlockForTests();
  });

  it("waits for the third completed order or the fifth review", () => {
    const now = 1_000_000_000_000;
    expect(shouldAskForReview({ ordersCompleted: 2, reviewsReceived: 4, lastAskedAt: null, now, errored: false })).toBe(false);
    expect(shouldAskForReview({ ordersCompleted: 3, reviewsReceived: 0, lastAskedAt: null, now, errored: false })).toBe(true);
    expect(shouldAskForReview({ ordersCompleted: 0, reviewsReceived: 5, lastAskedAt: null, now, errored: false })).toBe(true);
  });

  it("stays quiet on an error and for 90 days after an ask", () => {
    const now = 1_000_000_000_000;
    expect(shouldAskForReview({ ordersCompleted: 3, reviewsReceived: 0, lastAskedAt: null, now, errored: true })).toBe(false);
    expect(shouldAskForReview({ ordersCompleted: 3, reviewsReceived: 0, lastAskedAt: now - 10 * day, now, errored: false })).toBe(false);
    expect(shouldAskForReview({ ordersCompleted: 3, reviewsReceived: 0, lastAskedAt: now - REVIEW_GAP_MS, now, errored: false })).toBe(true);
  });

  it("does not ask after a crash in this session", async () => {
    blockReviewAfterError();
    const asked = await considerReviewPrompt(
      { ordersCompleted: 3, reviewsReceived: 0, errored: false, now: 50 },
      { readAskedAt: async () => null, writeAskedAt: async () => undefined, requestReview: async () => true }
    );
    expect(asked).toBe(false);
  });

  it("remembers the higher count", () => {
    expect(nextCounts(1, 2, 4, 1)).toEqual({ ordersCompleted: 4, reviewsReceived: 2 });
  });
});
