import { formatAdminCompact, formatAdminMoney, validateMoneyReason } from "../src/admin/format";

describe("admin money labels", () => {
  it("formats rupees using Indian digit grouping", () => {
    expect(formatAdminMoney(123456789, "en")).toBe("₹12,34,568");
    expect(formatAdminMoney(123456789, "hi")).toContain("₹");
  });

  it("uses lakh and crore for compact totals", () => {
    expect(formatAdminCompact(123456789, "en")).toBe("₹12.3 L");
    expect(formatAdminCompact(1_234_567_800, "en")).toBe("₹1.2 Cr");
    expect(formatAdminCompact(1_234_567_800, "hi")).toContain("करोड़");
  });

  it("requires a meaningful reason before a money action", () => {
    expect(validateMoneyReason("  ")).toBe(false);
    expect(validateMoneyReason("ok")).toBe(false);
    expect(validateMoneyReason("Verified payout statement")).toBe(true);
  });
});
