import AsyncStorage from "@react-native-async-storage/async-storage";

export const APP_EVENT_NAMES = [
  "app_open",
  "signup_complete",
  "setup_complete",
  "first_qr_shown",
  "order_status_changed",
  "widget_added"
] as const;

export type AppEventName = (typeof APP_EVENT_NAMES)[number];

const INSTALL_KEY = "reviewqr.installId";
const INSTALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function eventBody(name: AppEventName, installId: string) {
  return { name, installId };
}

function randomInstallId() {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") return cryptoRef.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const roll = Math.floor(Math.random() * 16);
    const value = char === "x" ? roll : (roll & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function readInstallId() {
  const existing = await AsyncStorage.getItem(INSTALL_KEY).catch(() => null);
  if (existing && INSTALL_ID.test(existing)) return existing;
  const next = randomInstallId();
  await AsyncStorage.setItem(INSTALL_KEY, next).catch(() => undefined);
  return next;
}

/** Posts one funnel event. The body is only the event name and a random install id. */
export async function trackAppEvent(name: AppEventName) {
  const base = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) return;
  try {
    const installId = await readInstallId();
    await fetch(`${base}/api/v1/app/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(eventBody(name, installId))
    });
  } catch {
    return;
  }
}

export async function trackOnce(name: "first_qr_shown" | "widget_added") {
  const key = `reviewqr.tracked.${name}`;
  const seen = await AsyncStorage.getItem(key).catch(() => null);
  if (seen) return;
  await trackAppEvent(name);
  await AsyncStorage.setItem(key, "1").catch(() => undefined);
}
