import { buildReferralShareText, normalizeReferralHome, projectedExpiryDisplay, stageForReward } from "../src/referral/presentation";

describe("referral presentation", () => {
  it("maps payment reward states to the progress stages", () => {
    expect(stageForReward(null)).toBe("SIGNED_UP");
    expect(stageForReward("INVITED")).toBe("INVITED");
    expect(stageForReward("PENDING")).toBe("PAID");
    expect(stageForReward("PAID")).toBe("PAID");
    expect(stageForReward("APPLIED")).toBe("REWARD_ADDED");
    expect(stageForReward("REWARD_ADDED")).toBe("REWARD_ADDED");
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

  it("normalizes the old response without inventing new referral details", () => {
    const home = normalizeReferralHome({
      code: "OLD123",
      link: "https://qr24x7.in/refer/OLD123",
      rewards: [{ id: "reward-1", months: 2, at: "2026-01-02T00:00:00.000Z" }]
    });

    expect(home.code).toBe("OLD123");
    expect(home.referrals).toEqual([]);
    expect(home.legacyRewards).toEqual([{ id: "reward-1", months: 2, at: "2026-01-02T00:00:00.000Z" }]);
    expect(home.monthsPerReferral).toBe(0);
    expect(home.maxMonthsPerYear).toBe(0);
    expect(home.monthsEarnedThisYear).toBe(0);
    expect(home.currentEndsAt).toBeNull();
    expect(home.projectedEndsAt).toBeNull();
    expect(home.creditMonths).toBe(0);
    expect(home.hasRewardDetails).toBe(false);
    expect(home.hasYearlyCap).toBe(false);
    expect(home.hasCurrentExpiry).toBe(false);
    expect(home.shareText.en).toContain("OLD123");
    expect(home.shareText.hi).toContain("OLD123");
  });

  it("builds an English and Hindi fallback when shareText is absent", () => {
    const en = buildReferralShareText(undefined, "en", "QR42", "https://qr24x7.in/refer/QR42");
    const hi = buildReferralShareText(undefined, "hi", "QR42", "https://qr24x7.in/refer/QR42");

    expect(en).toContain("QR42");
    expect(en).toContain("https://qr24x7.in/refer/QR42");
    expect(hi).toContain("QR42");
    expect(hi).toContain("https://qr24x7.in/refer/QR42");
  });
});
