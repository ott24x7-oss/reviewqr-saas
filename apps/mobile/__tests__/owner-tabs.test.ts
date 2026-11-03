import { OWNER_TAB_SLOTS, OWNER_VISIBLE_TABS, ownerShowQrTarget } from "../src/nav/owner-tabs";

describe("owner tab configuration", () => {
  it("keeps four route tabs and five equal visual slots with QR in the centre", () => {
    expect(OWNER_VISIBLE_TABS).toEqual(["index", "orders", "shop", "more"]);
    expect(OWNER_TAB_SLOTS).toEqual(["index", "orders", "qr", "shop", "more"]);
    expect(OWNER_TAB_SLOTS).toHaveLength(5);
    expect(OWNER_TAB_SLOTS.indexOf("qr")).toBe(2);
  });

  it("targets the focused customer QR view", () => {
    expect(ownerShowQrTarget()).toEqual({ pathname: "/(app)/tap", params: { section: "qr" } });
  });
});
