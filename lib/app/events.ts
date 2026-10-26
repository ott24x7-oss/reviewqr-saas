export const APP_EVENT_NAMES = [
  "app_open",
  "signup_complete",
  "setup_complete",
  "first_qr_shown",
  "order_status_changed",
  "widget_added"
] as const;

export type AppEventName = (typeof APP_EVENT_NAMES)[number];

const INSTALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAppEvent(body: unknown): { ok: true; name: AppEventName; installId: string } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request" };
  const record = body as Record<string, unknown>;
  const extra = Object.keys(record).filter((key) => key !== "name" && key !== "installId");
  if (extra.length > 0) return { ok: false, error: "Invalid request" };
  if (typeof record.name !== "string" || !APP_EVENT_NAMES.includes(record.name as AppEventName)) {
    return { ok: false, error: "Unknown event" };
  }
  if (typeof record.installId !== "string" || !INSTALL_ID.test(record.installId)) {
    return { ok: false, error: "Invalid install" };
  }
  return { ok: true, name: record.name as AppEventName, installId: record.installId.toLowerCase() };
}
