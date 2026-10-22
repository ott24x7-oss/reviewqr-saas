export type PreferencePatch = {
  emailOptIn?: boolean;
  whatsappOptIn?: boolean;
  clearUnsubscribed: boolean;
};

/** Only boolean fields that were sent. A true value is an explicit opt-in. */
export function preferenceUpdate(body: unknown): { ok: true; patch: PreferencePatch; empty: boolean } | { ok: false } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false };
  const record = body as Record<string, unknown>;
  const patch: PreferencePatch = { clearUnsubscribed: false };
  let seen = false;
  for (const key of ["emailOptIn", "whatsappOptIn"] as const) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    if (typeof record[key] !== "boolean") return { ok: false };
    patch[key] = record[key];
    if (record[key] === true) patch.clearUnsubscribed = true;
    seen = true;
  }
  return { ok: true, patch, empty: !seen };
}
