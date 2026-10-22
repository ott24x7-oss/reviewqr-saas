/**
 * Unregister push, revoke the refresh token, then drop cached account data.
 * Push deletion uses the access token, so it runs before revoke clears it.
 */
export async function endSession(input: {
  baseUrl: string;
  accessToken: string | null;
  pushToken: string | null;
  fetchImpl?: typeof fetch;
  revoke: () => Promise<void>;
  clearQuery: () => void;
  clearBusinessId: () => Promise<void>;
  clearPushToken: () => Promise<void>;
}) {
  const fetchImpl = input.fetchImpl || fetch;
  const base = input.baseUrl.replace(/\/$/, "");
  if (input.accessToken && input.pushToken) {
    await fetchImpl(`${base}/api/v1/push-devices`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ token: input.pushToken })
    }).catch(() => undefined);
  }
  await input.revoke();
  input.clearQuery();
  await input.clearBusinessId();
  await input.clearPushToken();
}
