import { describe, expect, it } from "vitest";
import { createApiClient } from "../../packages/shared/src/client";

describe("api client", () => {
  it("refreshes once after a 401 and retries without reading that body", async () => {
    let refreshes = 0;
    const seen: string[] = [];
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get("authorization") || "";
      seen.push(auth);
      if (auth === "Bearer old") return new Response("expired", { status: 401 });
      return new Response("ok", { status: 200 });
    };
    const client = createApiClient({
      getAccessToken: () => "old",
      refreshAccessToken: async () => {
        refreshes += 1;
        await Promise.resolve();
        return "new";
      },
      fetchImpl: fetchImpl as typeof fetch
    });

    const [first, second] = await Promise.all([client.request("/api/v1/me"), client.request("/api/v1/me")]);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.text()).toBe("ok");
    expect(refreshes).toBe(1);
    expect(seen.filter((auth) => auth === "Bearer new")).toHaveLength(2);
  });

  it("returns the 401 when refresh cannot mint a token", async () => {
    let calls = 0;
    const client = createApiClient({
      getAccessToken: () => "old",
      refreshAccessToken: async () => null,
      fetchImpl: async () => {
        calls += 1;
        return new Response("no", { status: 401 });
      }
    });
    const res = await client.request("/api/v1/me");
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("no");
    expect(calls).toBe(1);
  });
});
