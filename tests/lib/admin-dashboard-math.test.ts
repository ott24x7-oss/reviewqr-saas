import { describe, expect, it } from "vitest";
import { activationStats, percentChange, planMix, revenueBreakdown } from "@/lib/admin/dashboard-math";

describe("admin dashboard calculations", () => {
  it("splits first-time payments, renewals, refunds, and net", () => {
    expect(revenueBreakdown([
      { id: "first", amount: 5000 },
      { id: "renewal", amount: 3000 },
      { id: "second", amount: 2000 }
    ], ["first"], 1000)).toEqual({ newPaise: 5000, renewalPaise: 5000, refundPaise: 1000, netPaise: 9000 });
  });

  it("handles empty and populated activation cohorts", () => {
    expect(activationStats([])).toEqual({ activated: 0, total: 0, rate: 0 });
    expect(activationStats([{ hasBusiness: true }, { hasBusiness: false }, { hasBusiness: true }])).toEqual({ activated: 2, total: 3, rate: 67 });
  });

  it("calculates zero-baseline deltas and grouped plan MRR", () => {
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(2, 0)).toBe(100);
    expect(percentChange(75, 100)).toBe(-25);
    expect(planMix([
      { planId: "pro", name: "Pro", status: "ACTIVE", pricePaise: 12000, duration: "YEAR_1" },
      { planId: "pro", name: "Pro", status: "TRIALING", pricePaise: 12000, duration: "YEAR_1" },
      { planId: null, name: "Custom", status: "ACTIVE", pricePaise: 5000, duration: "LIFETIME" }
    ])).toEqual([
      { planId: "pro", name: "Pro", count: 2, mrrPaise: 1000 },
      { planId: null, name: "Custom", count: 1, mrrPaise: 0 }
    ]);
  });
});
