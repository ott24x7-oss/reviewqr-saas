import { createApiClient, type TokenPair } from "@reviewqr/shared";

export const REFRESH_KEY = "reviewqr.refresh";

export type TokenStore = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

export type MobileApi = ReturnType<typeof createMobileApi>;

/**
 * Access token stays in memory. The refresh token stays in the supplied store
 * (SecureStore on device). A 401 refreshes once for every caller waiting on it.
 */
export function createMobileApi(options: {
  baseUrl: string;
  store: TokenStore;
  fetchImpl?: typeof fetch;
  deviceName?: string;
}) {
  let accessToken: string | null = null;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  async function refreshAccessToken() {
    const refreshToken = await options.store.get(REFRESH_KEY);
    if (!refreshToken) return null;
    const fetchImpl = options.fetchImpl || fetch;
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken, deviceName: options.deviceName || "Android" })
      });
    } catch {
      return null;
    }
    if (res.status === 400 || res.status === 401) {
      accessToken = null;
      await options.store.remove(REFRESH_KEY);
      return null;
    }
    if (!res.ok) return null;
    let json: { data?: TokenPair };
    try {
      json = (await res.json()) as { data?: TokenPair };
    } catch {
      return null;
    }
    if (!json.data?.accessToken || !json.data.refreshToken) return null;
    accessToken = json.data.accessToken;
    await options.store.set(REFRESH_KEY, json.data.refreshToken);
    return accessToken;
  }

  const client = createApiClient({
    baseUrl,
    getAccessToken: () => accessToken,
    refreshAccessToken,
    fetchImpl: options.fetchImpl
  });

  function request(path: string, init: RequestInit = {}) {
    return client.request(path, { ...init, credentials: init.credentials ?? "omit" });
  }

  return {
    request,
    getAccessToken: () => accessToken,
    async saveSession(pair: TokenPair) {
      accessToken = pair.accessToken;
      await options.store.set(REFRESH_KEY, pair.refreshToken);
    },
    async restore() {
      const refreshToken = await options.store.get(REFRESH_KEY);
      if (!refreshToken) return false;
      const next = await refreshAccessToken();
      return Boolean(next);
    },
    async logout() {
      const refreshToken = await options.store.get(REFRESH_KEY);
      if (refreshToken) {
        await request("/api/v1/auth/logout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken })
        }).catch(() => undefined);
      }
      accessToken = null;
      await options.store.remove(REFRESH_KEY);
    }
  };
}
