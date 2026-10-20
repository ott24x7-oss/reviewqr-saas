import { describe, expect, it } from "vitest";
import { reviewSubmitSchema } from "../../lib/validations";

describe("review submit validation", () => {
  const base = { businessSlug: "demo-cafe", rating: 2, feedback: "The tea was cold" };

  it("accepts a feedback form where the customer skipped the NPS question", () => {
    expect(reviewSubmitSchema.safeParse({ ...base, npsScore: null }).success).toBe(true);
    expect(reviewSubmitSchema.safeParse(base).success).toBe(true);
  });

  it("still rejects an out-of-range NPS score", () => {
    expect(reviewSubmitSchema.safeParse({ ...base, npsScore: 11 }).success).toBe(false);
  });
});
