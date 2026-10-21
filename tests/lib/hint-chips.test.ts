import { describe, expect, it } from "vitest";
import { appendHint, draftWordCount } from "../../lib/review-policy";

describe("topic hints", () => {
  it("inserts a hint into the customer's own text", () => {
    expect(appendHint("", "fresh coffee")).toBe("fresh coffee");
    expect(appendHint("The staff was kind", "fresh coffee")).toBe("The staff was kind fresh coffee");
  });

  it("counts a draft as ready for cleanup only after a few words", () => {
    expect(draftWordCount("too short")).toBe(2);
    expect(draftWordCount("The coffee was hot")).toBe(4);
  });
});
