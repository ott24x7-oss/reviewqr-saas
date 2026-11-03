import { cartStepError, normalizeShopQuantity, validateShopAddress } from "../src/shop/cart-validation";

describe("shop cart step validation", () => {
  it("validates the delivery address fields", () => {
    expect(validateShopAddress({ name: "", phone: "9876543210", line1: "Road", city: "Pune", state: "Maharashtra", pincode: "411001" })).toBe("name");
    expect(validateShopAddress({ name: "A", phone: "12345", line1: "Road", city: "Pune", state: "Maharashtra", pincode: "411001" })).toBe("phone");
    expect(validateShopAddress({ name: "A", phone: "9876543210", line1: "Road", city: "Pune", state: "Maharashtra", pincode: "411001" })).toBeNull();
  });

  it("keeps quantities at or above the product minimum and within stock", () => {
    expect(normalizeShopQuantity(1, 3, 8)).toBe(3);
    expect(normalizeShopQuantity(99, 3, 8)).toBe(8);
  });

  it("reports cart issues in step order", () => {
    const ready = { lines: [{ qty: 2, minQty: 1, stock: 8, active: true, designError: null }], needsShipping: true, addressId: null, quote: { ok: true } };
    expect(cartStepError({ ...ready, lines: [] })).toBe("empty");
    expect(cartStepError({ ...ready, addressId: null })).toBe("address");
    expect(cartStepError({ ...ready, needsShipping: false, lines: [{ ...ready.lines[0], designError: "Choose a QR code" }] })).toBe("Choose a QR code");
    expect(cartStepError({ ...ready, needsShipping: false, quote: { ok: false, error: "Not enough stock" } })).toBe("Not enough stock");
    expect(cartStepError({ ...ready, needsShipping: false, addressId: null, quote: { ok: true } })).toBeNull();
  });
});
