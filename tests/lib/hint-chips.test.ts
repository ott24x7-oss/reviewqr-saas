import { describe, expect, it } from "vitest";
import { appendHint } from "../../lib/review-policy";

describe("topic hints", () => {
  it("inserts a hint into the customer's own text", () => {
    expect(appendHint("", "fresh coffee")).toBe("fresh coffee");
    expect(appendHint("The staff was kind", "fresh coffee")).toBe("The staff was kind fresh coffee");
  });
});
