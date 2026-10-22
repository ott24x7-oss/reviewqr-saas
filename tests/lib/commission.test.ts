import { describe, expect, it } from "vitest";
import { commissionPaise, scaleCredit, soleAgentId } from "../../lib/shop/commission";

describe("shop commission", () => {
  it("pays a renewal only when the owner has one agent", () => {
    expect(soleAgentId(["agent-1"])).toBe("agent-1");
    expect(soleAgentId(["agent-1", "agent-1", null, ""])).toBe("agent-1");
    expect(soleAgentId([])).toBeNull();
    expect(soleAgentId([null, "  "])).toBeNull();
    expect(soleAgentId(["agent-1", "agent-2"])).toBeNull();
  });

  it("rounds commission and ignores a percent outside 1 to 100", () => {
    expect(commissionPaise(149900, 10)).toBe(14990);
    expect(commissionPaise(100, 1)).toBe(1);
    expect(commissionPaise(149900, 0)).toBe(0);
    expect(commissionPaise(149900, 101)).toBe(0);
  });

  it("copies tax on a full credit and scales a partial credit", () => {
    expect(
      scaleCredit({
        amountPaise: 11800,
        totalPaise: 11800,
        taxablePaise: 10000,
        cgstPaise: 900,
        sgstPaise: 900,
        igstPaise: 0
      })
    ).toEqual({ amountPaise: 11800, taxablePaise: 10000, cgstPaise: 900, sgstPaise: 900, igstPaise: 0 });
    const half = scaleCredit({
      amountPaise: 5900,
      totalPaise: 11800,
      taxablePaise: 10000,
      cgstPaise: 900,
      sgstPaise: 900,
      igstPaise: 0
    });
    expect(half.amountPaise).toBe(5900);
    expect(half.cgstPaise + half.sgstPaise + half.igstPaise + half.taxablePaise).toBe(5900);
    expect(half.igstPaise).toBe(0);
    expect(scaleCredit({ amountPaise: 0, totalPaise: 100, taxablePaise: 100, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 }).amountPaise).toBe(0);
  });
});
