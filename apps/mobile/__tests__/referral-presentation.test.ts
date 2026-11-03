import { buildReferralHeroText, buildReferralShareText, normalizeReferralHome, projectedExpiryDisplay, stageForReward } from "../src/referral/presentation";

describe("referral presentation", () => {
  const referralLink = "https://qr24x7.in/refer/QR42";
  const expectLinkLast = (text: string) => {
    expect(text.endsWith(`\n${referralLink}`)).toBe(true);
    expect(text.slice(-referralLink.length)).toBe(referralLink);
  };

  const englishHeroCopy = {
    fallback: "Share your link and invite a business to QR24x7.",
    withFriendBonus: "Give {friendDays}, get up to {freeMonths}",
    withoutFriendBonus: "Get up to {freeMonths} for every business you refer"
  };
  const hindiHeroCopy = {
    fallback: "अपना लिंक शेयर करें और किसी बिज़नेस को QR24x7 से जोड़ें।",
    withFriendBonus: "रेफ़र किए गए बिज़नेस को {friendDays} दें और हर रेफ़रल पर अधिकतम {freeMonths} पाएँ",
    withoutFriendBonus: "हर रेफ़र किए गए बिज़नेस पर अधिकतम {freeMonths} पाएँ"
  };

  it("shows the months-only hero when the friend bonus is zero", () => {
    expect(buildReferralHeroText(0, 3, "en", englishHeroCopy))
      .toBe("Get up to 3 free months for every business you refer");
    expect(buildReferralHeroText(0, 3, "hi", hindiHeroCopy))
      .toBe("हर रेफ़र किए गए बिज़नेस पर अधिकतम 3 मुफ़्त महीने पाएँ");
  });

  it("shows the friend days and referral months when the friend bonus is positive", () => {
    expect(buildReferralHeroText(4, 2, "en", englishHeroCopy)).toBe("Give 4 days, get up to 2 free months");
    expect(buildReferralHeroText(4, 2, "hi", hindiHeroCopy))
      .toBe("रेफ़र किए गए बिज़नेस को 4 दिन दें और हर रेफ़रल पर अधिकतम 2 मुफ़्त महीने पाएँ");
  });

  it("uses singular day and month labels", () => {
    expect(buildReferralHeroText(1, 1, "en", englishHeroCopy)).toBe("Give 1 day, get up to 1 free month");
    expect(buildReferralHeroText(1, 1, "hi", hindiHeroCopy))
      .toBe("रेफ़र किए गए बिज़नेस को 1 दिन दें और हर रेफ़रल पर अधिकतम 1 मुफ़्त महीना पाएँ");
  });

  it("uses the fallback when there are no free months", () => {
    expect(buildReferralHeroText(7, 0, "en", englishHeroCopy)).toBe(englishHeroCopy.fallback);
    expect(buildReferralHeroText(7, undefined, "hi", hindiHeroCopy)).toBe(hindiHeroCopy.fallback);
  });

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
    const en = buildReferralShareText(undefined, "en", "QR42", referralLink);
    const hi = buildReferralShareText(undefined, "hi", "QR42", referralLink);

    expect(en).toContain("QR42");
    expectLinkLast(en);
    expect(hi).toContain("QR42");
    expectLinkLast(hi);
  });

  it("omits a zero friend bonus from the client share fallback", () => {
    const en = buildReferralShareText(undefined, "en", "QR42", referralLink, {
      bonusDaysForFriend: 0,
      monthsPerReferral: 3
    });
    const hi = buildReferralShareText(undefined, "hi", "QR42", referralLink, {
      bonusDaysForFriend: 0,
      monthsPerReferral: 3
    });

    expect(en).not.toContain("bonus day");
    expect(en).toContain("3 free months");
    expect(hi).not.toContain("बोनस दिन");
    expect(hi).toContain("3 मुफ़्त महीने");
    expectLinkLast(en);
    expectLinkLast(hi);
  });

  it("uses singular day and month labels in client share fallback", () => {
    const en = buildReferralShareText(undefined, "en", "QR42", referralLink, {
      bonusDaysForFriend: 1,
      monthsPerReferral: 1
    });
    const hi = buildReferralShareText(undefined, "hi", "QR42", referralLink, {
      bonusDaysForFriend: 1,
      monthsPerReferral: 1
    });

    expect(en).toContain("1 bonus day");
    expect(en).toContain("1 free month");
    expect(hi).toContain("1 बोनस दिन मिलेगा");
    expect(hi).toContain("1 मुफ़्त महीना मिलेगा");
    expectLinkLast(en);
    expectLinkLast(hi);
  });
});
