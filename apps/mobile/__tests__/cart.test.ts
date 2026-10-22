import { cartPaise, linePaise } from "../src/shop/totals";

describe("cart maths", () => {
  it("multiplies quantity by the unit price in paise", () => {
    expect(linePaise(2, 15000)).toBe(30000);
    expect(linePaise(1.6, 100)).toBe(200);
    expect(linePaise(-1, 100)).toBe(0);
  });

  it("sums every line", () => {
    expect(
      cartPaise([
        { qty: 2, unitPaise: 10000 },
        { qty: 1, unitPaise: 5000 }
      ])
    ).toBe(25000);
    expect(cartPaise([])).toBe(0);
  });
});
