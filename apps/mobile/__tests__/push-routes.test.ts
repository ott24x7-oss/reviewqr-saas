import { routeForPush } from "../src/push/routes";

describe("push routes", () => {
  it("opens feedback, orders, billing, and a shop shipment", () => {
    expect(routeForPush({ type: "negative_feedback", reviewId: "r1" })).toBe("/(app)/orders?tab=feedback");
    expect(routeForPush({ type: "store_order", orderId: "o1" })).toBe("/(app)/orders?tab=orders");
    expect(routeForPush({ type: "booking_request", bookingId: "b1" })).toBe("/(app)/bookings");
    expect(routeForPush({ url: "https://reviewqr.example/dashboard/sell/bookings" })).toBe("/(app)/bookings");
    expect(routeForPush({ type: "plan_reminder", kind: "expiry" })).toBe("/(app)/plan");
    expect(routeForPush({ type: "plan_active" })).toBe("/(app)/plan");
    expect(routeForPush({ type: "referral_reward", url: "/dashboard/refer" })).toBe("/(app)/refer");
    expect(routeForPush({ url: "https://reviewqr.example/dashboard/shop/orders/ord_1" })).toBe("/(app)/shop?order=ord_1");
    expect(routeForPush({ type: "order_status", url: "https://reviewqr.example/dashboard/shop/orders/ord_2?source=push" })).toBe("/(app)/shop?order=ord_2");
    expect(routeForPush({ type: "shop_order_status", order: "ord_3", url: "https://reviewqr.example/dashboard/shop/orders/ord_3" })).toBe("/(app)/shop?order=ord_3");
    expect(routeForPush({ url: "reviewqr://shop?order=ord_1" })).toBe("/(app)/shop?order=ord_1");
    expect(routeForPush({ url: "qr24x7://shop?order=ord_1" })).toBe("/(app)/shop?order=ord_1");
    expect(routeForPush({ order: "ord_1" })).toBe("/(app)/shop?order=ord_1");
    expect(routeForPush({ url: "reviewqr://shop?order=a%2Fb" })).toBe("/(app)");
    expect(routeForPush({ url: "reviewqr://shop?order=.." })).toBe("/(app)");
    expect(routeForPush({ url: "reviewqr://shop?order=" })).toBe("/(app)");
    expect(routeForPush({ url: "https://reviewqr.example/dashboard/shop/orders/a/b" })).toBe("/(app)");
    expect(routeForPush({ url: "https://reviewqr.example/dashboard/shop/orders/ord 1" })).toBe("/(app)");
    expect(routeForPush({ order: "../secret" })).toBe("/(app)");
    expect(routeForPush({})).toBe("/(app)");
  });
});
