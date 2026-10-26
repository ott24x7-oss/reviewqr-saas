import { describe, expect, it } from "vitest";
import { payoutStatementCsv } from "../../lib/plans/statement";
import { financialYearBounds, tdsForPayout } from "../../lib/plans/tds";

describe("commission TDS", () => {
  it("uses the Indian financial year", () => {
    const before = financialYearBounds(new Date("2026-03-31T18:29:00.000Z"));
    const after = financialYearBounds(new Date("2026-03-31T18:30:00.000Z"));
    expect(before.start.toISOString()).toBe("2025-03-31T18:30:00.000Z");
    expect(after.start.toISOString()).toBe("2026-03-31T18:30:00.000Z");
  });

  it("taxes only the amount above the threshold", () => {
    expect(
      tdsForPayout({ grossPaise: 8000, alreadyGrossPaise: 0, tdsPercent: 10, thresholdPaise: 10000 })
    ).toEqual({ grossPaise: 8000, tdsPaise: 0, netPaise: 8000 });
    expect(
      tdsForPayout({ grossPaise: 5000, alreadyGrossPaise: 8000, tdsPercent: 10, thresholdPaise: 10000 })
    ).toEqual({ grossPaise: 5000, tdsPaise: 300, netPaise: 4700 });
  });

  it("writes a statement the agent can download", () => {
    const csv = payoutStatementCsv([
      {
        paidAt: new Date("2026-08-01T00:00:00.000Z"),
        grossPaise: 5000,
        tdsPaise: 300,
        netPaise: 4700,
        amountPaise: 4700,
        utr: "UTR,1"
      }
    ]);
    expect(csv).toBe("paidAt,grossPaise,tdsPaise,netPaise,utr\n2026-08-01T00:00:00.000Z,5000,300,4700,\"UTR,1\"");
  });
});
