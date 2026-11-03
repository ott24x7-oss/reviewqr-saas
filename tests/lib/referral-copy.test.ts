import { describe, expect, it } from "vitest";
import { buildOwnerReferralShareText } from "../../lib/owner/referral-copy";

describe("owner referral share copy", () => {
  const link = "https://qr24x7.in/refer/ABC";
  const expectLinkLast = (text: string) => {
    expect(text.endsWith(`\n${link}`)).toBe(true);
    expect(text.slice(-link.length)).toBe(link);
  };

  it("omits the friend's bonus when it is zero", () => {
    const copy = buildOwnerReferralShareText(link, 0, 3);

    expect(copy.en).not.toContain("you get");
    expect(copy.en).toContain("I get up to 3 free months");
    expect(copy.hi).not.toContain("बोनस दिन");
    expect(copy.hi).toContain("3 मुफ़्त महीने");
    expectLinkLast(copy.en);
    expectLinkLast(copy.hi);
  });

  it("uses singular units for one day and one month in English and Hindi", () => {
    const copy = buildOwnerReferralShareText(link, 1, 1);

    expect(copy.en).toContain("1 bonus day");
    expect(copy.en).toContain("1 free month");
    expect(copy.hi).toContain("1 बोनस दिन मिलेगा");
    expect(copy.hi).toContain("1 मुफ़्त महीना मिलेगा");
    expectLinkLast(copy.en);
    expectLinkLast(copy.hi);
  });

  it("uses plural units for larger configured rewards", () => {
    const copy = buildOwnerReferralShareText(link, 4, 2);

    expect(copy.en).toContain("4 bonus days");
    expect(copy.en).toContain("2 free months");
    expect(copy.hi).toContain("4 बोनस दिन मिलेंगे");
    expect(copy.hi).toContain("2 मुफ़्त महीने मिलेंगे");
    expectLinkLast(copy.en);
    expectLinkLast(copy.hi);
  });
});
