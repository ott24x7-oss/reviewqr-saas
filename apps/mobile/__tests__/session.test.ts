import { createMobileApi, type TokenStore } from "../src/api/session";

function memoryStore(): TokenStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => {
      map.set(key, value);
    },
    remove: async (key) => {
      map.delete(key);
    }
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const pair = {
  accessToken: "new-access",
  refreshToken: "refresh-2",
  expiresIn: 900,
  tokenType: "Bearer" as const
};

describe("mobile API refresh", () => {
  it("refreshes once when two requests get a 401", async () => {
    let refreshes = 0;
    const store = memoryStore();
    await store.set("reviewqr.refresh", "refresh-1");
    const api = createMobileApi({
      baseUrl: "https://api.test",
      store,
      fetchImpl: async (url, init) => {
        const href = String(url);
        if (href.endsWith("/api/v1/auth/refresh")) {
          refreshes += 1;
          await new Promise((resolve) => setTimeout(resolve, 20));
          return json({ data: pair });
        }
        const auth = new Headers(init?.headers).get("authorization");
        if (auth !== "Bearer new-access") return json({ error: { code: "UNAUTHORIZED", message: "Sign in required" } }, 401);
        return json({ data: { ok: true } });
      }
    });

    const [first, second] = await Promise.all([api.request("/api/v1/me"), api.request("/api/v1/me")]);
    expect(refreshes).toBe(1);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await store.get("reviewqr.refresh")).toBe("refresh-2");
    expect(api.getAccessToken()).toBe("new-access");
  });

  it("clears the refresh token when refresh fails", async () => {
    const store = memoryStore();
    await store.set("reviewqr.refresh", "refresh-1");
    const api = createMobileApi({
      baseUrl: "https://api.test",
      store,
      fetchImpl: async (url) => {
        if (String(url).endsWith("/api/v1/auth/refresh")) return json({ error: { message: "no" } }, 401);
        return json({ error: { message: "Sign in required" } }, 401);
      }
    });
    const res = await api.request("/api/v1/me");
    expect(res.status).toBe(401);
    expect(await store.get("reviewqr.refresh")).toBeNull();
  });

  it("sends the refresh token on logout and then forgets it", async () => {
    const store = memoryStore();
    let logoutBody = "";
    const api = createMobileApi({
      baseUrl: "https://api.test",
      store,
      fetchImpl: async (url, init) => {
        if (String(url).endsWith("/api/v1/auth/logout")) logoutBody = String(init?.body || "");
        return json({ data: { ok: true } });
      }
    });
    await api.saveSession({ accessToken: "access", refreshToken: "refresh-9", expiresIn: 60, tokenType: "Bearer" });
    await api.logout();
    expect(logoutBody).toContain("refresh-9");
    expect(await store.get("reviewqr.refresh")).toBeNull();
    expect(api.getAccessToken()).toBeNull();
  });
});
