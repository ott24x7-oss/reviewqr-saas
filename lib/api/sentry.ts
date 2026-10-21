
/** Plain key/value env so callers (and tests) can pass a small object. */
type EnvLike = Record<string, string | undefined>;
/**
 * Sends one error event to a Sentry DSN with fetch. No SDK.
 * Does nothing when SENTRY_DSN is empty, and never throws.
 */
export async function reportError(
  err: unknown,
  context: { requestId: string; path: string },
  env: EnvLike = process.env,
  fetchImpl: typeof fetch = fetch
) {
  const dsn = (env.SENTRY_DSN || "").trim();
  if (!dsn) return;
  try {
    const parsed = new URL(dsn);
    const key = decodeURIComponent(parsed.username || "");
    const projectId = parsed.pathname.split("/").filter(Boolean).pop();
    if (!key || !projectId) return;
    const message = (err instanceof Error ? err.message : "error").slice(0, 300);
    const eventId = crypto.randomUUID().replace(/-/g, "");
    await fetchImpl(`${parsed.protocol}//${parsed.host}/api/${projectId}/store/`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_client=reviewqr/1.0, sentry_key=${key}`
      },
      body: JSON.stringify({
        event_id: eventId,
        message,
        level: "error",
        platform: "node",
        extra: { requestId: context.requestId, path: context.path }
      }),
      signal: AbortSignal.timeout(1500)
    });
  } catch {
    /* The request still returns. A dead collector must not take the API down. */
  }
}
