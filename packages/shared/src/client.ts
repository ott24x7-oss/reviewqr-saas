export type ApiClientOptions = {
  baseUrl?: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Called once after a 401. Return the new access token, or null to stop. */
  refreshAccessToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
};

/**
 * JSON fetch for the web and the mobile app.
 * A 401 refreshes the access token once and retries. The failed response body is left unread.
 */
export function createApiClient(options: ApiClientOptions = {}) {
  let inflight: Promise<string | null> | null = null;

  async function refreshOnce() {
    if (!options.refreshAccessToken) return null;
    if (!inflight) {
      inflight = options.refreshAccessToken().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  }

  async function request(path: string, init: RequestInit = {}, allowRefresh = true): Promise<Response> {
    const headers = new Headers(init.headers);
    const token = options.getAccessToken ? await options.getAccessToken() : null;
    if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
    const fetchImpl = options.fetchImpl || fetch;
    const url = `${options.baseUrl || ""}${path}`;
    const res = await fetchImpl(url, {
      ...init,
      headers,
      credentials: init.credentials ?? "include"
    });
    if (res.status !== 401 || !allowRefresh || !options.refreshAccessToken) return res;
    const next = await refreshOnce();
    if (!next) return res;
    const retryHeaders = new Headers(init.headers);
    retryHeaders.set("authorization", `Bearer ${next}`);
    return fetchImpl(url, {
      ...init,
      headers: retryHeaders,
      credentials: init.credentials ?? "include"
    });
  }

  return { request };
}
