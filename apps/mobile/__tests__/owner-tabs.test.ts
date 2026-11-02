import { OWNER_TAB_SLOTS, OWNER_VISIBLE_TABS } from "../src/nav/owner-tabs";

describe("owner tab configuration", () => {
  it("keeps the five owner tabs with QR in the middle", () => {
    expect(OWNER_VISIBLE_TABS).toEqual(["index", "orders", "reviews", "shop", "more"]);
    expect(OWNER_TAB_SLOTS).toEqual(["index", "orders", "reviews", "qr", "shop", "more"]);
  });
});
