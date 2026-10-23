import { ApiError } from "../src/api/http";
import { onlineFrom } from "../src/net/online";
import { flushOrderQueue, isNetworkFailure, queueOrderStatus } from "../src/orders/queue";

describe("connectivity", () => {
  it("treats a missing reachability check as online and a dead link as offline", () => {
    expect(onlineFrom(null)).toBe(true);
    expect(onlineFrom({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(onlineFrom({ isConnected: false, isInternetReachable: true })).toBe(false);
    expect(onlineFrom({ isConnected: true, isInternetReachable: false })).toBe(false);
  });
});

describe("order status queue", () => {
  it("keeps the latest status for an order", () => {
    const first = queueOrderStatus([], { orderId: "a", status: "PREPARING", at: 1 });
    const next = queueOrderStatus(first, { orderId: "a", status: "READY", at: 2 });
    expect(next).toEqual([{ orderId: "a", status: "READY", at: 2 }]);
  });

  it("retries a network failure and drops a rejected status", async () => {
    const queue = [
      { orderId: "a", status: "READY", at: 1 },
      { orderId: "b", status: "COMPLETED", at: 2 }
    ];
    const result = await flushOrderQueue(queue, async (row) => {
      if (row.orderId === "a") throw new TypeError("Network request failed");
      throw new ApiError(400, "No");
    });
    expect(result.sent).toBe(0);
    expect(result.left.map((row) => row.orderId)).toEqual(["a"]);
    expect(isNetworkFailure(new ApiError(503, "down"))).toBe(true);
    expect(isNetworkFailure(new ApiError(400, "No"))).toBe(false);
  });
});
