import { emptySnapshot, formatWidget, parseSnapshot, QR_DEEP_LINK } from "../src/widgets/format";
import { routeForDeepLink, routeForPush } from "../src/push/routes";

describe("widget formatter", () => {
  it("asks a logged-out phone to open the app", () => {
    const view = formatWidget(null);
    expect(view.loggedIn).toBe(false);
    expect(view.signedOut).toBe("Open app to sign in");
    expect(view.scans).toBe("—");
    expect(formatWidget(emptySnapshot()).title).toBe("QR24x7");
  });

  it("prints cached today numbers", () => {
    const view = formatWidget({ ...emptySnapshot(), loggedIn: true, scans: 12, orders: 3, reviews: 4, businessName: "Spice Junction" });
    expect(view.title).toBe("QR24x7 Today");
    expect(view.scans).toBe("12");
    expect(view.orders).toBe("3");
    expect(view.reviews).toBe("4");
    expect(view.qrLabel).toBe("Show my QR");
  });

  it("drops a broken cache", () => {
    expect(parseSnapshot("[]").loggedIn).toBe(false);
    expect(parseSnapshot(JSON.stringify({ loggedIn: true, scans: -2, orders: 1.2 })).scans).toBe(0);
    expect(parseSnapshot(JSON.stringify({ loggedIn: true, scans: 1.6, orders: 2, reviews: 3 })).scans).toBe(2);
  });
});

describe("QR deep link", () => {
  it("opens the QR screen from the widget", () => {
    expect(QR_DEEP_LINK).toBe("qr24x7://qr");
    expect(routeForDeepLink("qr24x7://qr")).toBe("/(app)/tap");
    expect(routeForDeepLink("reviewqr://qr")).toBe("/(app)/tap");
    expect(routeForPush({ url: "qr24x7://qr" })).toBe("/(app)/tap");
    expect(routeForDeepLink("qr24x7://shop?order=ord_1")).toBe("/(app)/shop?order=ord_1");
  });
});
