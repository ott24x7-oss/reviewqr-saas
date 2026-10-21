import { describe, expect, it } from "vitest";
import { deadPushTokens, expoMessages } from "../../lib/push";

describe("Expo push payloads", () => {
  it("builds one message per token", () => {
    const messages = expoMessages(["ExponentPushToken[abc]", "ExpoPushToken[def]"], {
      title: "New order 12",
      body: "Sola Cafe · ₹80",
      data: { type: "store_order", orderId: "ord_1" }
    });
    expect(messages).toEqual([
      {
        to: "ExponentPushToken[abc]",
        title: "New order 12",
        body: "Sola Cafe · ₹80",
        data: { type: "store_order", orderId: "ord_1" },
        sound: "default"
      },
      {
        to: "ExpoPushToken[def]",
        title: "New order 12",
        body: "Sola Cafe · ₹80",
        data: { type: "store_order", orderId: "ord_1" },
        sound: "default"
      }
    ]);
  });

  it("drops blank tokens and marks DeviceNotRegistered tickets", () => {
    const messages = expoMessages(["", "ExponentPushToken[gone]"], { title: "Plan", body: "Ends today" });
    expect(messages).toHaveLength(1);
    expect(
      deadPushTokens(messages, [{ status: "error", details: { error: "DeviceNotRegistered" } }])
    ).toEqual(["ExponentPushToken[gone]"]);
    expect(deadPushTokens(messages, [{ status: "ok" }])).toEqual([]);
  });
});
