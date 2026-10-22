import { pollPayment } from "../src/shop/poll";

describe("shop payment polling", () => {
  it("keeps going after one failed check, then reports paid", async () => {
    let clock = 0;
    let calls = 0;
    const sleeps: number[] = [];
    const result = await pollPayment({
      orderId: "ord_1",
      signal: new AbortController().signal,
      deadlineMs: 20_000,
      now: () => clock,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
      fetchOrder: async () => {
        calls += 1;
        if (calls === 1) throw new Error("network");
        if (calls === 2) return { paymentStatus: "PENDING" };
        return { paymentStatus: "PAID" };
      }
    });
    expect(result).toBe("paid");
    expect(calls).toBe(3);
    expect(sleeps).toEqual([1000, 2000]);
  });

  it("returns pending when the deadline passes and does not throw", async () => {
    let clock = 0;
    let calls = 0;
    const result = await pollPayment({
      orderId: "ord_1",
      signal: new AbortController().signal,
      deadlineMs: 3000,
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      fetchOrder: async () => {
        calls += 1;
        throw new Error("down");
      }
    });
    expect(result).toBe("pending");
    expect(calls).toBeGreaterThan(1);
  });

  it("stops when the signal aborts", async () => {
    const controller = new AbortController();
    const result = await pollPayment({
      orderId: "ord_1",
      signal: controller.signal,
      deadlineMs: 20_000,
      now: () => 0,
      sleep: async () => {
        throw new Error("aborted");
      },
      fetchOrder: async () => {
        controller.abort();
        throw new Error("network");
      }
    });
    expect(result).toBe("stopped");
  });
});
