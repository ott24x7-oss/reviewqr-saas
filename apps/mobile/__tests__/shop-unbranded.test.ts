import { toggleUnbrandedSwitch, unbrandedQuoteDisplay } from "../src/shop/totals";

describe("mobile unbranded add-on helpers", () => {
  it("toggles add-on selection in both directions", () => {
    expect(toggleUnbrandedSwitch(false)).toBe(true);
    expect(toggleUnbrandedSwitch(true)).toBe(false);
  });

  it("shows only the quoted unbranded lines as a separate quote row", () => {
    expect(unbrandedQuoteDisplay([
      { unbranded: false, netPaise: 50000 },
      { unbranded: true, netPaise: 9900 },
      { unbranded: true, netPaise: 19800 }
    ], "Unbranded add-on")).toEqual({ label: "Unbranded add-on", amountPaise: 29700 });
    expect(unbrandedQuoteDisplay([{ unbranded: false, netPaise: 50000 }], "Unbranded add-on")).toBeNull();
  });
});
