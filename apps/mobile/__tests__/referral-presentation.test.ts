import { buildReferralShareText, projectedExpiryDisplay, stageForReward } from "../src/referral/presentation";

describe("referral presentation", () => {
  it("maps payment reward states to the progress stages", () => {
    expect(stageForReward(null)).toBe("SIGNED_UP");
    expect(stageForReward("INVITED")).toBe("INVITED");
    expect(stageForReward("PENDING")).toBe("PAID");
    expect(stageForReward("APPLIED")).toBe("REWARD_ADDED");
    expect(stageForReward("REVERSED")).toBe("REVERSED");
  });

  it("shows a projected expiry with a localized date", () => {
    expect(projectedExpiryDisplay("2027-01-02T00:00:00.000Z", "en")).toContain("extends to");
    expect(projectedExpiryDisplay(null, "en")).toBe("");
  });

  it("builds share copy in the selected language", () => {
    const copy = { en: "Join QR24x7: https://example.test", hi: "QR24x7 से जुड़ें: https://example.test" };
    expect(buildReferralShareText(copy, "en")).toBe(copy.en);
    expect(buildReferralShareText(copy, "hi")).toBe(copy.hi);
  });
});
