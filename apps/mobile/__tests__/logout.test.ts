import { endSession } from "../src/auth/end-session";
import { accountKey } from "../src/query/keys";

describe("logout", () => {
  it("scopes cached queries to the signed-in user", () => {
    expect(accountKey("user-1", "businesses")).toEqual(["user-1", "businesses"]);
    expect(accountKey("user-1", "shop-order", "ord_1")).toEqual(["user-1", "shop-order", "ord_1"]);
  });

  it("unregisters push before revoking, then clears the cache and business id", async () => {
    const order: string[] = [];
    const calls: Array<{ url: string; method: string; authorization: string | null; body: string }> = [];
    await endSession({
      baseUrl: "https://api.test/",
      accessToken: "access-1",
      pushToken: "ExponentPushToken[abc]",
      fetchImpl: async (url, init) => {
        order.push("push");
        calls.push({
          url: String(url),
          method: String(init?.method),
          authorization: new Headers(init?.headers).get("authorization"),
          body: String(init?.body || "")
        });
        return new Response(JSON.stringify({ error: { message: "no" } }), { status: 401 });
      },
      revoke: async () => {
        order.push("revoke");
      },
      clearQuery: () => {
        order.push("query");
      },
      clearBusinessId: async () => {
        order.push("business");
      },
      clearPushToken: async () => {
        order.push("push-token");
      }
    });
    expect(order).toEqual(["push", "revoke", "query", "business", "push-token"]);
    expect(calls).toEqual([
      {
        url: "https://api.test/api/v1/push-devices",
        method: "DELETE",
        authorization: "Bearer access-1",
        body: JSON.stringify({ token: "ExponentPushToken[abc]" })
      }
    ]);
  });

  it("skips push unregister when this device has no token", async () => {
    const order: string[] = [];
    await endSession({
      baseUrl: "https://api.test",
      accessToken: "access-1",
      pushToken: null,
      fetchImpl: async () => {
        order.push("push");
        return new Response("{}", { status: 200 });
      },
      revoke: async () => {
        order.push("revoke");
      },
      clearQuery: () => {
        order.push("query");
      },
      clearBusinessId: async () => {
        order.push("business");
      },
      clearPushToken: async () => {
        order.push("push-token");
      }
    });
    expect(order).toEqual(["revoke", "query", "business", "push-token"]);
  });
});
