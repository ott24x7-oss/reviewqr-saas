const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const BEARER = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const QUERY_SECRET = /([?&](?:token|access_token|refresh_token|email|phone|otp|code|password)=)[^&\s]+/gi;
const PHONE = /(?:\+91[\s-]?)?[6-9](?:[\s-]?\d){9}\b|\+\d{10,15}\b/g;
const SECRET_KEY = /email|phone|token|authorization|password|cookie|otp|secret|devcode/i;

/** Release and dist match the Play binary: app version plus versionCode. */
export function sentryIdentity(version: string, versionCode: number) {
  const safeVersion = version.trim() || "0.0.0";
  const code = Number.isFinite(versionCode) ? Math.max(0, Math.floor(versionCode)) : 0;
  return {
    release: `com.qr24x7.app@${safeVersion}+${code}`,
    dist: String(code)
  };
}

export function scrubText(value: string) {
  return value
    .replace(EMAIL, "[email]")
    .replace(JWT, "[token]")
    .replace(BEARER, "Bearer [token]")
    .replace(QUERY_SECRET, "$1[redacted]")
    .replace(PHONE, "[phone]");
}

export function scrubValue(value: unknown, key?: string): unknown {
  if (key && SECRET_KEY.test(key)) return "[redacted]";
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map((item) => scrubValue(item));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) {
      out[childKey] = scrubValue(child, childKey);
    }
    return out;
  }
  return value;
}

/** Drop the user block. Phone, email, and tokens never leave the device. */
export function scrubSentryEvent<T>(event: T): T {
  const scrubbed = scrubValue(event);
  if (!scrubbed || typeof scrubbed !== "object") return event;
  delete (scrubbed as { user?: unknown }).user;
  return scrubbed as T;
}
