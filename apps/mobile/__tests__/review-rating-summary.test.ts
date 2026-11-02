import { reviewRatingSummary } from "../src/reviews/rating-summary";

describe("review rating summary", () => {
  it("shows no ratings instead of a fake average for an empty set", () => {
    expect(reviewRatingSummary(5, 0)).toEqual({ average: "—", empty: true });
  });

  it("formats an average when ratings exist", () => {
    expect(reviewRatingSummary(4.96, 3)).toEqual({ average: "5.0", empty: false });
  });
});
